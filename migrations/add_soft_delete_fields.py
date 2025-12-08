"""
Migration: Add soft delete fields for messages and threads
- Add deleted_for_users JSON field to messages (stores list of user UUIDs who deleted it)
- Add hidden_for_users JSON field to threads (stores list of user UUIDs who hid it)
"""

import sqlite3
import json
from datetime import datetime

def run_migration(db_path: str = "database.db"):
    """Run the migration to add soft delete fields"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print(f"[{datetime.now()}] Starting migration: add_soft_delete_fields")
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(messages)")
        messages_columns = [col[1] for col in cursor.fetchall()]
        
        cursor.execute("PRAGMA table_info(threads)")
        threads_columns = [col[1] for col in cursor.fetchall()]
        
        # Add deleted_for_users to messages if it doesn't exist
        if 'deleted_for_users' not in messages_columns:
            print("Adding 'deleted_for_users' column to messages table...")
            cursor.execute("""
                ALTER TABLE messages 
                ADD COLUMN deleted_for_users TEXT DEFAULT '[]'
            """)
            print("✓ Added deleted_for_users to messages")
        else:
            print("✓ deleted_for_users already exists in messages")
        
        # Add hidden_for_users to threads if it doesn't exist
        if 'hidden_for_users' not in threads_columns:
            print("Adding 'hidden_for_users' column to threads table...")
            cursor.execute("""
                ALTER TABLE threads 
                ADD COLUMN hidden_for_users TEXT DEFAULT '[]'
            """)
            print("✓ Added hidden_for_users to threads")
        else:
            print("✓ hidden_for_users already exists in threads")
        
        conn.commit()
        print(f"[{datetime.now()}] Migration completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"[{datetime.now()}] Migration failed: {str(e)}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()

