use argon2::Version as Argon2Version;
use keepass::{
    config::{DatabaseConfig, KdfConfig},
    Database as KeepassDatabase, DatabaseKey,
};
use secrecy::{ExposeSecret, SecretString};
use std::fs::File;
use std::path::PathBuf;
use std::time::SystemTime;

use super::error::DatabaseError;
use super::types::KdfInfo;

pub struct Database {
    pub db: KeepassDatabase,
    pub path: PathBuf,
    pub password: SecretString,
    pub last_modified: Option<SystemTime>,
}

impl Database {
    pub fn create(path: PathBuf, password: String) -> Result<Self, DatabaseError> {
        let secret_password = SecretString::new(password);
        
        // Extract database name from filename (without .kdbx extension)
        let db_name = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Root")
            .to_string();
        
        // Create database with strong KDF configuration (KDBX4 format with Argon2id)
        // Note: memory is in BYTES (divided by 1024 internally to get KiB for argon2)
        let config = DatabaseConfig {
            kdf_config: KdfConfig::Argon2id {
                iterations: 2,                    // 2 iterations (KeePass recommendation)
                memory: 64 * 1024 * 1024,         // 64 MB in bytes (KeePass default)
                parallelism: 2,                   // 2 threads
                version: Argon2Version::Version13,
            },
            ..Default::default()
        };
        
        let mut db = KeepassDatabase::new(config);
        db.root.name = db_name;
        
        let mut new_db = Self {
            db,
            path: path.clone(),
            password: secret_password,
            last_modified: None,
        };
        
        new_db.save()?;
        new_db.last_modified = std::fs::metadata(&path)
            .ok()
            .and_then(|m| m.modified().ok());
        
        Ok(new_db)
    }

    pub fn open(path: PathBuf, password: String) -> Result<Self, DatabaseError> {
        let secret_password = SecretString::new(password);
        
        let file = File::open(&path)
            .map_err(|e| DatabaseError::OpenError(format!("Failed to open file: {}", e)))?;

        let key = DatabaseKey::new().with_password(secret_password.expose_secret());
        
        let db = KeepassDatabase::open(&mut std::io::BufReader::new(file), key)
            .map_err(|e| {
                if e.to_string().contains("Invalid credentials") {
                    DatabaseError::InvalidCredentials
                } else {
                    DatabaseError::OpenError(e.to_string())
                }
            })?;

        let last_modified = std::fs::metadata(&path)
            .ok()
            .and_then(|m| m.modified().ok());

        Ok(Self {
            db,
            path,
            password: secret_password,
            last_modified,
        })
    }

    pub fn save(&mut self) -> Result<(), DatabaseError> {
        let key = DatabaseKey::new().with_password(self.password.expose_secret());
        
        let file = File::create(&self.path)
            .map_err(|e| DatabaseError::SaveError(format!("Failed to create file: {}", e)))?;

        self.db
            .save(&mut std::io::BufWriter::new(file), key)
            .map_err(|e| DatabaseError::SaveError(e.to_string()))?;

        self.last_modified = std::fs::metadata(&self.path)
            .ok()
            .and_then(|m| m.modified().ok());

        Ok(())
    }

    pub fn check_for_changes(&self) -> Result<bool, DatabaseError> {
        let current_modified = std::fs::metadata(&self.path)
            .ok()
            .and_then(|m| m.modified().ok());

        Ok(match (self.last_modified, current_modified) {
            (Some(last), Some(current)) => current > last,
            _ => false,
        })
    }

    pub fn merge_database(&mut self) -> Result<(), DatabaseError> {
        let file = File::open(&self.path)
            .map_err(|e| DatabaseError::OpenError(format!("Failed to open file: {}", e)))?;

        let key = DatabaseKey::new().with_password(self.password.expose_secret());
        
        let disk_db = KeepassDatabase::open(&mut std::io::BufReader::new(file), key)
            .map_err(|e| DatabaseError::OpenError(e.to_string()))?;

        self.db = disk_db;
        
        self.last_modified = std::fs::metadata(&self.path)
            .ok()
            .and_then(|m| m.modified().ok());

        Ok(())
    }

    pub fn get_kdf_info(&self) -> KdfInfo {
        match &self.db.config.kdf_config {
            KdfConfig::Aes { rounds } => KdfInfo {
                kdf_type: "AES".to_string(),
                is_weak: *rounds < 60000,
                iterations: Some(*rounds),
                memory: None,
                parallelism: None,
            },
            KdfConfig::Argon2 { iterations, memory, parallelism, .. } => {
                let memory_mb = memory / (1024 * 1024);
                let is_weak = *iterations < 2 || memory_mb < 64 || *parallelism < 2;
                KdfInfo {
                    kdf_type: "Argon2d".to_string(),
                    is_weak,
                    iterations: Some(*iterations),
                    memory: Some(*memory),
                    parallelism: Some(*parallelism),
                }
            },
            KdfConfig::Argon2id { iterations, memory, parallelism, .. } => {
                let memory_mb = memory / (1024 * 1024);
                let is_weak = *iterations < 2 || memory_mb < 64 || *parallelism < 2;
                KdfInfo {
                    kdf_type: "Argon2id".to_string(),
                    is_weak,
                    iterations: Some(*iterations),
                    memory: Some(*memory),
                    parallelism: Some(*parallelism),
                }
            },
        }
    }

    pub fn upgrade_kdf_parameters(&mut self) -> Result<(), DatabaseError> {
        self.db.config.kdf_config = KdfConfig::Argon2id {
            iterations: 2,
            memory: 64 * 1024 * 1024,
            parallelism: 2,
            version: Argon2Version::Version13,
        };
        self.save()?;
        Ok(())
    }
}
