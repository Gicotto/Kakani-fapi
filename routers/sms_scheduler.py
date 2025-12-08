"""
SMS Invite Scheduler

This module provides background task scheduling for automatically sending
SMS invites to recipients who don't have usernames.

Usage options:

1. As a standalone script (run periodically via cron):
   python sms_scheduler.py

2. As a FastAPI background task:
   from sms_scheduler import schedule_sms_processing
   # Then call it in your FastAPI startup event

3. Using APScheduler for continuous operation:
   python sms_scheduler.py --continuous
"""

import asyncio
import logging
from datetime import datetime
from typing import Optional
import argparse
from sms import process_pending_sms_invites

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def run_sms_invite_processor(base_url: str = "https://yourapp.com"):
    """
    Run the SMS invite processor once
    
    Args:
        base_url: Base URL of your application
    """
    try:
        logger.info("Starting SMS invite processing...")
        results = process_pending_sms_invites(base_url=base_url)
        
        logger.info(f"SMS Processing Complete:")
        logger.info(f"  Total Processed: {results['total_processed']}")
        logger.info(f"  Successful: {results['successful_sends']}")
        logger.info(f"  Failed: {results['failed_sends']}")
        
        # Log any failures
        if results['failed_sends'] > 0:
            logger.warning("Failed sends detected:")
            for detail in results['details']:
                if not detail['result']['success']:
                    logger.warning(f"  Invite {detail['invite_id']}, Recipient {detail['recipient']}: {detail['result']['error']}")
        
        return results
    
    except Exception as e:
        logger.error(f"Error processing SMS invites: {str(e)}")
        raise


async def schedule_sms_processing_continuous(
    interval_minutes: int = 5,
    base_url: str = "https://yourapp.com"
):
    """
    Continuously process SMS invites at regular intervals
    
    Args:
        interval_minutes: How often to check for pending invites (default: 5 minutes)
        base_url: Base URL of your application
    """
    logger.info(f"Starting continuous SMS processing (every {interval_minutes} minutes)...")
    
    while True:
        try:
            run_sms_invite_processor(base_url=base_url)
        except Exception as e:
            logger.error(f"Error in continuous processing: {str(e)}")
        
        # Wait for the specified interval
        await asyncio.sleep(interval_minutes * 60)


# For use with APScheduler (optional)
def setup_apscheduler(
    interval_minutes: int = 5,
    base_url: str = "https://yourapp.com"
):
    """
    Setup APScheduler for automatic SMS processing
    
    Install: pip install apscheduler
    
    Args:
        interval_minutes: How often to check for pending invites
        base_url: Base URL of your application
    """
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        
        scheduler = BackgroundScheduler()
        scheduler.add_job(
            func=lambda: run_sms_invite_processor(base_url),
            trigger="interval",
            minutes=interval_minutes,
            id="sms_invite_processor",
            name="Process pending SMS invites",
            replace_existing=True
        )
        scheduler.start()
        
        logger.info(f"APScheduler started - SMS processing every {interval_minutes} minutes")
        return scheduler
    
    except ImportError:
        logger.error("APScheduler not installed. Install with: pip install apscheduler")
        raise


# FastAPI integration
def setup_fastapi_background_task(app, interval_minutes: int = 5, base_url: str = "https://yourapp.com"):
    """
    Setup as a FastAPI background task
    
    Usage in main.py:
        from sms_scheduler import setup_fastapi_background_task
        
        app = FastAPI()
        
        @app.on_event("startup")
        async def startup_event():
            setup_fastapi_background_task(app, interval_minutes=5)
    
    Args:
        app: FastAPI application instance
        interval_minutes: How often to check for pending invites
        base_url: Base URL of your application
    """
    @app.on_event("startup")
    async def start_sms_scheduler():
        asyncio.create_task(schedule_sms_processing_continuous(interval_minutes, base_url))
        logger.info("SMS scheduler started as FastAPI background task")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SMS Invite Scheduler")
    parser.add_argument(
        "--continuous",
        action="store_true",
        help="Run continuously instead of one-time"
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=5,
        help="Interval in minutes for continuous mode (default: 5)"
    )
    parser.add_argument(
        "--base-url",
        type=str,
        default="https://yourapp.com",
        help="Base URL of your application"
    )
    parser.add_argument(
        "--use-apscheduler",
        action="store_true",
        help="Use APScheduler instead of asyncio"
    )
    
    args = parser.parse_args()
    
    if args.continuous:
        if args.use_apscheduler:
            # Use APScheduler
            scheduler = setup_apscheduler(
                interval_minutes=args.interval,
                base_url=args.base_url
            )
            
            # Keep the script running
            try:
                while True:
                    asyncio.sleep(60)
            except (KeyboardInterrupt, SystemExit):
                scheduler.shutdown()
                logger.info("Scheduler stopped")
        else:
            # Use asyncio
            asyncio.run(schedule_sms_processing_continuous(
                interval_minutes=args.interval,
                base_url=args.base_url
            ))
    else:
        # Run once
        run_sms_invite_processor(base_url=args.base_url)