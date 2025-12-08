from twilio.rest import Client
from typing import Optional, List, Dict
import os
from datetime import datetime
from db import Session, engine, select
from models.database import InviteLinks, Users
from sqlalchemy import and_, or_
from config import settings

# Twilio configuration
TWILIO_ACCOUNT_SID = settings.twilio_account_sid
TWILIO_AUTH_TOKEN = settings.twilio_auth_token
TWILIO_PHONE_NUMBER = settings.twilio_phone_number

# Initialize Twilio client
def get_twilio_client() -> Client:
    """Initialize and return Twilio client"""
    if not all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER]):
        raise ValueError("Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.")
    
    return Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)


def send_sms(to_phone: str, message: str) -> Dict:
    """
    Send an SMS message using Twilio
    
    Args:
        to_phone: Recipient phone number (E.164 format recommended, e.g., +1234567890)
        message: Message content to send
    
    Returns:
        Dict with success status and message details or error
    """
    try:
        client = get_twilio_client()
        
        # Ensure phone number is in correct format
        if not to_phone.startswith('+'):
            # Assume US number if no country code
            to_phone = f"+1{to_phone.replace('-', '').replace('(', '').replace(')', '').replace(' ', '')}"
        
        message_response = client.messages.create(
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=to_phone
        )
        
        return {
            "success": True,
            "sid": message_response.sid,
            "status": message_response.status,
            "to": to_phone,
            "message": "SMS sent successfully"
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "to": to_phone,
            "message": "Failed to send SMS"
        }


def send_invite_sms(
    to_phone: str, 
    invite_code: str, 
    from_username: Optional[str] = None,
    base_url: str = "https://yourapp.com"
) -> Dict:
    """
    Send an invite link via SMS
    
    Args:
        to_phone: Recipient phone number
        invite_code: The invite code to send
        from_username: Optional username of the person who created the invite
        base_url: Base URL of your application
    
    Returns:
        Dict with success status and details
    """
    # Construct invite URL
    invite_url = f"{base_url}/invite/{invite_code}"
    
    # Construct message
    if from_username:
        message = f"{from_username} has invited you to connect! Use code: {invite_code} or visit: {invite_url}"
    else:
        message = f"You've been invited to connect! Use code: {invite_code} or visit: {invite_url}"
    
    return send_sms(to_phone, message)


def process_pending_sms_invites(base_url: str = "https://yourapp.com") -> Dict:
    """
    Process all pending invites that need to be sent via SMS.
    This looks for invites where:
    - Recipient has a phone number but no username
    - OR recipient has not accepted yet and has a phone number
    
    This function can be called periodically (e.g., via a cron job or scheduled task)
    
    Args:
        base_url: Base URL of your application
    
    Returns:
        Dict with statistics about sent messages
    """
    results = {
        "total_processed": 0,
        "successful_sends": 0,
        "failed_sends": 0,
        "details": []
    }
    
    with Session(engine) as session:
        # Get all invites
        invites = session.exec(select(InviteLinks)).all()
        
        for invite in invites:
            # Skip if expired
            if invite.expires_at:
                expires = datetime.fromisoformat(invite.expires_at)
                if datetime.utcnow() > expires:
                    continue
            
            # Get creator info for message personalization
            creator = session.get(Users, invite.created_by)
            creator_username = creator.Username if creator else None
            
            # Check recipient 1
            if invite.recipient1_phone and not invite.recipient1_accepted:
                # Only send if they don't have a username (username users get in-app notifications)
                if not invite.recipient1_username:
                    results["total_processed"] += 1
                    result = send_invite_sms(
                        to_phone=invite.recipient1_phone,
                        invite_code=invite.code,
                        from_username=creator_username,
                        base_url=base_url
                    )
                    
                    if result["success"]:
                        results["successful_sends"] += 1
                    else:
                        results["failed_sends"] += 1
                    
                    results["details"].append({
                        "invite_id": invite.id,
                        "recipient": "1",
                        "phone": invite.recipient1_phone,
                        "result": result
                    })
            
            # Check recipient 2
            if invite.recipient2_phone and not invite.recipient2_accepted:
                # Only send if they don't have a username (username users get in-app notifications)
                if not invite.recipient2_username:
                    results["total_processed"] += 1
                    result = send_invite_sms(
                        to_phone=invite.recipient2_phone,
                        invite_code=invite.code,
                        from_username=creator_username,
                        base_url=base_url
                    )
                    
                    if result["success"]:
                        results["successful_sends"] += 1
                    else:
                        results["failed_sends"] += 1
                    
                    results["details"].append({
                        "invite_id": invite.id,
                        "recipient": "2",
                        "phone": invite.recipient2_phone,
                        "result": result
                    })
    
    return results


def send_notification_sms(
    to_phone: str,
    notification_type: str,
    message: str,
    from_username: Optional[str] = None
) -> Dict:
    """
    Send a notification via SMS
    
    Args:
        to_phone: Recipient phone number
        notification_type: Type of notification (e.g., 'invite_accepted', 'thread_created')
        message: Notification message
        from_username: Optional username of the person triggering the notification
    
    Returns:
        Dict with success status and details
    """
    # Customize message based on type
    sms_message = message
    if from_username and notification_type == "invite_accepted":
        sms_message = f"{from_username} accepted your invite! {message}"
    elif from_username and notification_type == "thread_created":
        sms_message = f"You're now connected with {from_username}! {message}"
    
    return send_sms(to_phone, sms_message)


def get_sms_status(message_sid: str) -> Dict:
    """
    Check the status of a sent SMS message
    
    Args:
        message_sid: Twilio message SID
    
    Returns:
        Dict with message status details
    """
    try:
        client = get_twilio_client()
        message = client.messages(message_sid).fetch()
        
        return {
            "success": True,
            "sid": message.sid,
            "status": message.status,
            "to": message.to,
            "from": message.from_,
            "date_sent": message.date_sent,
            "error_code": message.error_code,
            "error_message": message.error_message
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


# Optional: Function to handle incoming SMS (webhook)
def handle_incoming_sms(from_phone: str, body: str) -> Dict:
    """
    Handle incoming SMS messages (for use with Twilio webhooks)
    
    Args:
        from_phone: Phone number that sent the message
        body: Content of the SMS
    
    Returns:
        Dict with processing result
    """
    # Example: Check if message contains an invite code
    body_upper = body.upper().strip()
    
    with Session(engine) as session:
        # Try to find invite by code
        invite = session.exec(
            select(InviteLinks).where(InviteLinks.code == body_upper)
        ).first()
        
        if invite:
            return {
                "success": True,
                "action": "invite_found",
                "invite_code": invite.code,
                "message": "Invite code recognized"
            }
        
        return {
            "success": True,
            "action": "no_action",
            "message": "Message received but no action taken"
        }