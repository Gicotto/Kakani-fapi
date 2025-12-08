"""
Combined Notification Scheduler (SMS + Email)

This module provides background task scheduling for automatically sending
both SMS and email invites to recipients.

Usage options:

1. As a standalone script (run periodically via cron):
   python notification_scheduler.py

2. As a FastAPI background task:
   from notification_scheduler import schedule_notification_processing
   
3. Using APScheduler for continuous operation:
   python notification_scheduler.py --continuous
"""

import asyncio
import logging
from datetime import datetime
from typing import Optional
import argparse
from sms import process_pending_sms_invites
from email import process_pending_email_invites

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def run_notification_processor(base_url: str = "https://yourapp.com"):
    """
    Run both SMS and email notification processors
    
    Args:
        base_url: Base URL of your application
    """
    try:
        logger.info("Starting notification processing (SMS + Email)...")
        
        # Process SMS invites
        logger.info("Processing SMS invites...")
        sms_results = process_pending_sms_invites(base_url=base_url)
        logger.info(f"SMS Processing Complete:")
        logger.info(f"  Total Processed: {sms_results['total_processed']}")
        logger.info(f"  Successful: {sms_results['successful_sends']}")
        logger.info(f"  Failed: {sms_results['failed_sends']}")
        
        # Log SMS failures
        if sms_results['failed_sends'] > 0:
            logger.warning("SMS failures detected:")
            for detail in sms_results['details']:
                if not detail['result']['success']:
                    logger.warning(f"  Invite {detail['invite_id']}, Recipient {detail['recipient']}: {detail['result']['error']}")
        
        # Process Email invites
        logger.info("Processing email invites...")
        email_results = process_pending_email_invites(base_url=base_url)
        logger.info(f"Email Processing Complete:")
        logger.info(f"  Total Processed: {email_results['total_processed']}")
        logger.info(f"  Successful: {email_results['successful_sends']}")
        logger.info(f"  Failed: {email_results['failed_sends']}")
        
        # Log email failures
        if email_results['failed_sends'] > 0:
            logger.warning("Email failures detected:")
            for detail in email_results['details']:
                if not detail['result']['success']:
                    logger.warning(f"  Invite {detail['invite_id']}, Recipient {detail['recipient']}: {detail['result']['error']}")
        
        # Combined results
        combined_results = {
            "timestamp": datetime.utcnow().isoformat(),
            "sms": sms_results,
            "email": email_results,
            "total_processed": sms_results['total_processed'] + email_results['total_processed'],
            "total_successful": sms_results['successful_sends'] + email_results['successful_sends'],
            "total_failed": sms_results['failed_sends'] + email_results['failed_sends']
        }
        
        logger.info(f"Overall Summary:")
        logger.info(f"  Total Notifications: {combined_results['total_processed']}")
        logger.info(f"  Successful: {combined_results['total_successful']}")
        logger.info(f"  Failed: {combined_results['total_failed']}")
        
        return combined_results
    
    except Exception as e:
        logger.error(f"Error processing notifications: {str(e)}")
        raise


async def schedule_notification_processing_continuous(
    interval_minutes: int = 5,
    base_url: str = "https://yourapp.com"
):
    """
    Continuously process notifications at regular intervals
    
    Args:
        interval_minutes: How often to check for pending invites (default: 5 minutes)
        base_url: Base URL of your application
    """
    logger.info(f"Starting continuous notification processing (every {interval_minutes} minutes)...")
    
    while True:
        try:
            run_notification_processor(base_url=base_url)
        except Exception as e:
            logger.error(f"Error in continuous processing: {str(e)}")
        
        # Wait for the specified interval
        await asyncio.sleep(interval_minutes * 60)


def setup_apscheduler(
    interval_minutes: int = 5,
    base_url: str = "https://yourapp.com"
):
    """
    Setup APScheduler for automatic notification processing
    
    Install: pip install apscheduler
    
    Args:
        interval_minutes: How often to check for pending invites
        base_url: Base URL of your application
    """
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        
        scheduler = BackgroundScheduler()
        scheduler.add_job(
            func=lambda: run_notification_processor(base_url),
            trigger="interval",
            minutes=interval_minutes,
            id="notification_processor",
            name="Process pending SMS and email invites",
            replace_existing=True
        )
        scheduler.start()
        
        logger.info(f"APScheduler started - Notification processing every {interval_minutes} minutes")
        return scheduler
    
    except ImportError:
        logger.error("APScheduler not installed. Install with: pip install apscheduler")
        raise


def setup_fastapi_background_task(app, interval_minutes: int = 5, base_url: str = "https://yourapp.com"):
    """
    Setup as a FastAPI background task
    
    Usage in main.py:
        from notification_scheduler import setup_fastapi_background_task
        
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
    async def start_notification_scheduler():
        asyncio.create_task(schedule_notification_processing_continuous(interval_minutes, base_url))
        logger.info("Notification scheduler started as FastAPI background task")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Notification Scheduler (SMS + Email)")
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
    parser.add_argument(
        "--sms-only",
        action="store_true",
        help="Only process SMS invites"
    )
    parser.add_argument(
        "--email-only",
        action="store_true",
        help="Only process email invites"
    )
    
    args = parser.parse_args()
    
    # Handle SMS or email only modes
    if args.sms_only:
        from sms import process_pending_sms_invites
        if args.continuous:
            async def sms_only_continuous():
                while True:
                    try:
                        process_pending_sms_invites(base_url=args.base_url)
                    except Exception as e:
                        logger.error(f"Error: {str(e)}")
                    await asyncio.sleep(args.interval * 60)
            asyncio.run(sms_only_continuous())
        else:
            process_pending_sms_invites(base_url=args.base_url)
    elif args.email_only:
        from email import process_pending_email_invites
        if args.continuous:
            async def email_only_continuous():
                while True:
                    try:
                        process_pending_email_invites(base_url=args.base_url)
                    except Exception as e:
                        logger.error(f"Error: {str(e)}")
                    await asyncio.sleep(args.interval * 60)
            asyncio.run(email_only_continuous())
        else:
            process_pending_email_invites(base_url=args.base_url)
    elif args.continuous:
        if args.use_apscheduler:
            # Use APScheduler
            scheduler = setup_apscheduler(
                interval_minutes=args.interval,
                base_url=args.base_url
            )
            
            # Keep the script running
            try:
                import time
                while True:
                    time.sleep(60)
            except (KeyboardInterrupt, SystemExit):
                scheduler.shutdown()
                logger.info("Scheduler stopped")
        else:
            # Use asyncio
            asyncio.run(schedule_notification_processing_continuous(
                interval_minutes=args.interval,
                base_url=args.base_url
            ))
    else:
        # Run once
        run_notification_processor(base_url=args.base_url)