from typing import Optional, Dict, List
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from db import Session, engine, select
from models.database import InviteLinks, Users
import logging
from config import settings

logger = logging.getLogger(__name__)

EMAIL_BACKEND = settings.email_backend
EMAIL_FROM = settings.email_from
EMAIL_FROM_NAME = settings.email_from_name

# SMTP Configuration
SMTP_HOST = settings.smtp_host
SMTP_PORT = settings.smtp_port
SMTP_USERNAME = settings.smtp_username
SMTP_PASSWORD = settings.smtp_password
SMTP_USE_TLS = settings.smtp_use_tls

SENDGRID_API_KEY = settings.sendgrid_api_key
RESEND_API_KEY = settings.resend_api_key


def send_email_smtp(to_email: str, subject: str, html_body: str, text_body: Optional[str] = None) -> Dict:
    """
    Send email using SMTP
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_body: HTML content of the email
        text_body: Plain text version (optional, will strip HTML if not provided)
    
    Returns:
        Dict with success status and details
    """
    try:
        if not all([SMTP_USERNAME, SMTP_PASSWORD]):
            raise ValueError("SMTP credentials not configured. Set SMTP_USERNAME and SMTP_PASSWORD.")
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{EMAIL_FROM_NAME} <{EMAIL_FROM}>"
        msg['To'] = to_email
        
        # Add text version
        if text_body:
            part1 = MIMEText(text_body, 'plain')
            msg.attach(part1)
        
        # Add HTML version
        part2 = MIMEText(html_body, 'html')
        msg.attach(part2)
        
        # Send email
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            if SMTP_USE_TLS:
                server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        
        return {
            "success": True,
            "to": to_email,
            "message": "Email sent successfully via SMTP"
        }
    
    except Exception as e:
        logger.error(f"Failed to send email via SMTP: {str(e)}")
        return {
            "success": False,
            "to": to_email,
            "error": str(e),
            "message": "Failed to send email"
        }


def send_email_sendgrid(to_email: str, subject: str, html_body: str, text_body: Optional[str] = None) -> Dict:
    """
    Send email using SendGrid API

    Args:
        to_email: Recipient email address
        subject: Email subject
        html_body: HTML content of the email
        text_body: Plain text version (optional)

    Returns:
        Dict with success status and details
    """
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail, Content

        if not SENDGRID_API_KEY:
            raise ValueError("SendGrid API key not configured. Set SENDGRID_API_KEY.")

        # Create message
        message = Mail(
            from_email=(EMAIL_FROM, EMAIL_FROM_NAME),
            to_emails=to_email,
            subject=subject,
            html_content=html_body
        )

        if text_body:
            message.content = [
                Content("text/plain", text_body),
                Content("text/html", html_body)
            ]

        # Send email
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)

        return {
            "success": True,
            "to": to_email,
            "status_code": response.status_code,
            "message": "Email sent successfully via SendGrid"
        }

    except ImportError:
        logger.error("SendGrid library not installed. Install with: pip install sendgrid")
        return {
            "success": False,
            "to": to_email,
            "error": "SendGrid library not installed",
            "message": "Failed to send email"
        }
    except Exception as e:
        logger.error(f"Failed to send email via SendGrid: {str(e)}")
        return {
            "success": False,
            "to": to_email,
            "error": str(e),
            "message": "Failed to send email"
        }


def send_email_resend(to_email: str, subject: str, html_body: str, text_body: Optional[str] = None) -> Dict:
    """
    Send email using Resend API

    Args:
        to_email: Recipient email address
        subject: Email subject
        html_body: HTML content of the email
        text_body: Plain text version (optional)

    Returns:
        Dict with success status and details
    """
    try:
        import requests

        if not RESEND_API_KEY:
            raise ValueError("Resend API key not configured. Set RESEND_API_KEY.")

        # Prepare email data
        email_data = {
            "from": f"{EMAIL_FROM_NAME} <{EMAIL_FROM}>",
            "to": [to_email],
            "subject": subject,
            "html": html_body,
        }

        if text_body:
            email_data["text"] = text_body

        # Send email via Resend API
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json"
            },
            json=email_data
        )

        if response.status_code == 200:
            return {
                "success": True,
                "to": to_email,
                "message": "Email sent successfully via Resend",
                "id": response.json().get("id")
            }
        else:
            error_msg = response.json().get("message", "Unknown error")
            logger.error(f"Failed to send email via Resend: {error_msg}")
            return {
                "success": False,
                "to": to_email,
                "error": error_msg,
                "message": "Failed to send email"
            }

    except Exception as e:
        logger.error(f"Failed to send email via Resend: {str(e)}")
        return {
            "success": False,
            "to": to_email,
            "error": str(e),
            "message": "Failed to send email"
        }


def send_email(to_email: str, subject: str, html_body: str, text_body: Optional[str] = None) -> Dict:
    """
    Send email using configured backend (SMTP, SendGrid, or Resend)

    Args:
        to_email: Recipient email address
        subject: Email subject
        html_body: HTML content of the email
        text_body: Plain text version (optional)

    Returns:
        Dict with success status and details
    """
    if EMAIL_BACKEND == "sendgrid":
        return send_email_sendgrid(to_email, subject, html_body, text_body)
    elif EMAIL_BACKEND == "resend":
        return send_email_resend(to_email, subject, html_body, text_body)
    else:
        return send_email_smtp(to_email, subject, html_body, text_body)


def create_invite_email_html(
    invite_code: str,
    from_username: Optional[str] = None,
    base_url: str = "https://Nudge.com"
) -> tuple[str, str]:
    """
    Create HTML and text versions of invite email
    
    Returns:
        Tuple of (html_body, text_body)
    """
    invite_url = f"{base_url}/invite/{invite_code}"
    
    # Text version
    if from_username:
        text_body = f"""
Hi!

{from_username} has invited you to connect on Nudge!

Your invite code is: {invite_code}

Click here to accept: {invite_url}

Or enter the code manually on our website.

Thanks,
The Nudge Team
        """
    else:
        text_body = f"""
Hi!

You've been invited to connect on Nudge!

Your invite code is: {invite_code}

Click here to accept: {invite_url}

Or enter the code manually on our website.

Thanks,
The Nudge Team
        """
    
    # HTML version
    if from_username:
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're Invited!</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #4F46E5; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">You're Invited!</h1>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 0 0 20px 0;">
                                Hi there!
                            </p>
                            <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 0 0 20px 0;">
                                <strong>{from_username}</strong> has invited you to connect on Nudge!
                            </p>
                            
                            <!-- Invite Code Box -->
                            <div style="background-color: #F3F4F6; border-left: 4px solid #4F46E5; padding: 15px; margin: 30px 0; border-radius: 4px;">
                                <p style="margin: 0 0 5px 0; font-size: 14px; color: #6B7280;">Your invite code:</p>
                                <p style="margin: 0; font-size: 24px; font-weight: bold; color: #1F2937; letter-spacing: 2px;">{invite_code}</p>
                            </div>
                            
                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{invite_url}" style="display: inline-block; background-color: #4F46E5; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                                    Accept Invitation
                                </a>
                            </div>
                            
                            <p style="font-size: 14px; color: #6B7280; line-height: 1.6; margin: 20px 0 0 0;">
                                Or copy and paste this link into your browser:<br>
                                <a href="{invite_url}" style="color: #4F46E5; word-break: break-all;">{invite_url}</a>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #F9FAFB; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0; font-size: 12px; color: #6B7280;">
                                © 2025 Nudge. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        """
    else:
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're Invited!</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background-color: #4F46E5; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">You're Invited!</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 0 0 20px 0;">
                                You've been invited to connect on Nudge!
                            </p>
                            <div style="background-color: #F3F4F6; border-left: 4px solid #4F46E5; padding: 15px; margin: 30px 0; border-radius: 4px;">
                                <p style="margin: 0 0 5px 0; font-size: 14px; color: #6B7280;">Your invite code:</p>
                                <p style="margin: 0; font-size: 24px; font-weight: bold; color: #1F2937; letter-spacing: 2px;">{invite_code}</p>
                            </div>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{invite_url}" style="display: inline-block; background-color: #4F46E5; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                                    Accept Invitation
                                </a>
                            </div>
                            <p style="font-size: 14px; color: #6B7280; line-height: 1.6; margin: 20px 0 0 0;">
                                Or copy and paste this link into your browser:<br>
                                <a href="{invite_url}" style="color: #4F46E5; word-break: break-all;">{invite_url}</a>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #F9FAFB; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0; font-size: 12px; color: #6B7280;">
                                © 2024 Nudge. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        """
    
    return html_body, text_body


def send_invite_email(
    to_email: str,
    invite_code: str,
    from_username: Optional[str] = None,
    base_url: str = "https://Nudge.com"
) -> Dict:
    """
    Send an invite link via email
    
    Args:
        to_email: Recipient email address
        invite_code: The invite code to send
        from_username: Optional username of the person who created the invite
        base_url: Base URL of your application
    
    Returns:
        Dict with success status and details
    """
    subject = f"You're invited to connect on Nudge!"
    if from_username:
        subject = f"{from_username} invited you to connect on Nudge!"
    
    html_body, text_body = create_invite_email_html(invite_code, from_username, base_url)
    
    return send_email(to_email, subject, html_body, text_body)


def create_notification_email_html(
    notification_type: str,
    message: str,
    from_username: Optional[str] = None,
    action_url: Optional[str] = None
) -> tuple[str, str]:
    """
    Create HTML and text versions of notification email
    
    Returns:
        Tuple of (html_body, text_body)
    """
    # Determine title based on notification type
    titles = {
        "invite_accepted": "Invite Accepted! 🎉",
        "thread_created": "Connection Established! 🤝",
        "message_received": "New Message 💬",
        "friend_request": "New Friend Request 👋"
    }
    title = titles.get(notification_type, "Notification")
    
    # Text version
    text_body = f"""
{title}

{message}
"""
    if from_username:
        text_body += f"\nFrom: {from_username}\n"
    
    if action_url:
        text_body += f"\nView: {action_url}\n"
    
    text_body += "\nThanks,\nThe Nudge Team"
    
    # HTML version
    button_html = ""
    if action_url:
        button_html = f"""
        <div style="text-align: center; margin: 30px 0;">
            <a href="{action_url}" style="display: inline-block; background-color: #4F46E5; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                View Details
            </a>
        </div>
        """
    
    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background-color: #4F46E5; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">{title}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 0 0 20px 0;">
                                {message}
                            </p>
                            {f'<p style="font-size: 14px; color: #6B7280; margin: 0 0 20px 0;"><strong>From:</strong> {from_username}</p>' if from_username else ''}
                            {button_html}
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #F9FAFB; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0; font-size: 12px; color: #6B7280;">
                                © 2024 Nudge. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    """
    
    return html_body, text_body


def send_notification_email(
    to_email: str,
    notification_type: str,
    message: str,
    from_username: Optional[str] = None,
    action_url: Optional[str] = None
) -> Dict:
    """
    Send a notification via email
    
    Args:
        to_email: Recipient email address
        notification_type: Type of notification
        message: Notification message
        from_username: Optional username of the person triggering the notification
        action_url: Optional URL for action button
    
    Returns:
        Dict with success status and details
    """
    titles = {
        "invite_accepted": "Invite Accepted!",
        "thread_created": "Connection Established!",
        "message_received": "New Message",
        "friend_request": "New Friend Request"
    }
    subject = titles.get(notification_type, "Notification from Nudge")
    
    html_body, text_body = create_notification_email_html(
        notification_type, message, from_username, action_url
    )
    
    return send_email(to_email, subject, html_body, text_body)


def process_pending_email_invites(base_url: str = "https://Nudge.com") -> Dict:
    """
    Process all pending invites that need to be sent via email.
    This looks for invites where recipient has an email but hasn't been notified yet.
    
    Args:
        base_url: Base URL of your application
    
    Returns:
        Dict with statistics about sent emails
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
            if invite.recipient1_email and not invite.recipient1_accepted:
                # Only send if they don't have a username (username users get in-app notifications)
                if not invite.recipient1_username:
                    results["total_processed"] += 1
                    result = send_invite_email(
                        to_email=invite.recipient1_email,
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
                        "email": invite.recipient1_email,
                        "result": result
                    })
            
            # Check recipient 2
            if invite.recipient2_email and not invite.recipient2_accepted:
                # Only send if they don't have a username (username users get in-app notifications)
                if not invite.recipient2_username:
                    results["total_processed"] += 1
                    result = send_invite_email(
                        to_email=invite.recipient2_email,
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
                        "email": invite.recipient2_email,
                        "result": result
                    })
    
    return results


def test_email_config() -> Dict:
    """
    Test email configuration by sending a test email
    Sends to the SMTP_USERNAME or a test address
    
    Returns:
        Dict with test results
    """
    test_email = SMTP_USERNAME or "juliangiovannycotto@gmail.com"
    
    html_body = """
    <html>
    <body>
        <h2>Email Configuration Test</h2>
        <p>If you're seeing this, your email configuration is working correctly!</p>
    </body>
    </html>
    """
    
    text_body = "Email Configuration Test\n\nIf you're seeing this, your email configuration is working correctly!"
    
    result = send_email(
        to_email=test_email,
        subject="Email Configuration Test",
        html_body=html_body,
        text_body=text_body
    )
    
    return result