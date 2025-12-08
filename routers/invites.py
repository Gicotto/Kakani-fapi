from fastapi import APIRouter, HTTPException, status
from models.schemas import InviteLinkCreate, InviteLinkAccept
from models.database import InviteLinks, Users, Threads, ThreadParticipants
from db import Session, engine, select
from datetime import datetime, timedelta
import secrets
import string
from routers.notifications import create_notification
from routers.sms import send_invite_sms, send_notification_sms
from routers.email import send_invite_email, send_notification_email
from config import settings
import logging
from typing import Optional, Dict

router = APIRouter(prefix="/invites", tags=["invites"])
logger = logging.getLogger(__name__)

# Get base URL from settings
BASE_URL = settings.app_base_url

def generate_invite_code(length: int = 8) -> str:
    """Generate a random alphanumeric invite code"""
    characters = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(characters) for _ in range(length))


def send_invite_notification(
    recipient_username: Optional[str],
    recipient_email: Optional[str],
    recipient_phone: Optional[str],
    invite_code: str,
    creator_username: str,
    creator_uuid: str,
    invite_id: int,
    session
) -> Dict:
    """
    Helper function to send invite notification via the appropriate channel
    
    Priority:
    1. In-app notification (if username exists)
    2. Email (if email exists and no username)
    3. SMS (if phone exists and no username/email)
    
    Returns:
        Dict with notification results
    """
    result = {"sent": False, "method": None, "error": None}
    
    # Priority 1: In-app notification for users with usernames
    if recipient_username:
        recipient = session.exec(
            select(Users).where(Users.Username == recipient_username)
        ).first()
        if recipient:
            try:
                create_notification(
                    session=session,
                    user_uuid=recipient.Uuid,
                    type="invite_received",
                    title="New Connection Invite",
                    message=f"{creator_username} has invited you to connect via invite code: {invite_code}",
                    from_user_uuid=creator_uuid,
                    related_id=invite_id,
                    action_url=f"/invites/accept/{invite_code}"
                )
                result["sent"] = True
                result["method"] = "in_app"
                logger.info(f"Sent in-app notification to {recipient_username}")
            except Exception as e:
                logger.error(f"Failed to send in-app notification: {str(e)}")
                result["error"] = str(e)
        return result
    
    # Priority 2: Email for users without username but with email
    if recipient_email:
        try:
            email_result = send_invite_email(
                to_email=recipient_email,
                invite_code=invite_code,
                from_username=creator_username,
                base_url=BASE_URL
            )
            result["sent"] = email_result["success"]
            result["method"] = "email"
            if not email_result["success"]:
                result["error"] = email_result.get("error")
                logger.error(f"Failed to send email: {email_result.get('error')}")
            else:
                logger.info(f"Sent email to {recipient_email}")
        except Exception as e:
            logger.error(f"Exception sending email: {str(e)}")
            result["error"] = str(e)
        return result
    
    # Priority 3: SMS for users with phone only
    if recipient_phone:
        try:
            sms_result = send_invite_sms(
                to_phone=recipient_phone,
                invite_code=invite_code,
                from_username=creator_username,
                base_url=BASE_URL
            )
            result["sent"] = sms_result["success"]
            result["method"] = "sms"
            if not sms_result["success"]:
                result["error"] = sms_result.get("error")
                logger.error(f"Failed to send SMS: {sms_result.get('error')}")
            else:
                logger.info(f"Sent SMS to {recipient_phone}")
        except Exception as e:
            logger.error(f"Exception sending SMS: {str(e)}")
            result["error"] = str(e)
        return result
    
    return result


@router.post("/create")
async def create_invite_link(invite: InviteLinkCreate, created_by: str):
    """
    Create a new invite link to connect two recipients.
    At least one identifier (username, email, or phone) is required for each recipient.
    Automatically sends notifications via the most appropriate channel:
    - In-app for username users
    - Email for email-only users
    - SMS for phone-only users
    
    Args:
        created_by: Username of the user creating the invite
    """
    # Validate at least one identifier per recipient
    if not any([invite.recipient1_username, invite.recipient1_email, invite.recipient1_phone]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recipient 1 must have at least one identifier (username, email, or phone)"
        )
    
    if not any([invite.recipient2_username, invite.recipient2_email, invite.recipient2_phone]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recipient 2 must have at least one identifier (username, email, or phone)"
        )
    
    with Session(engine) as session:
        # Verify creator exists - look up by username
        creator = session.exec(
            select(Users).where(Users.Username == created_by)
        ).first()
        
        if not creator:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Creator user '{created_by}' not found"
            )
        
        # Generate unique code
        code = generate_invite_code()
        while session.exec(select(InviteLinks).where(InviteLinks.code == code)).first():
            code = generate_invite_code()
        
        # Calculate expiration
        expires_at = None
        if invite.expires_in_hours:
            expires_at = (datetime.utcnow() + timedelta(hours=invite.expires_in_hours)).isoformat()
        
        # Create invite - store creator's UUID in database
        new_invite = InviteLinks(
            code=code,
            recipient1_username=invite.recipient1_username,
            recipient1_email=invite.recipient1_email,
            recipient1_phone=invite.recipient1_phone,
            recipient2_username=invite.recipient2_username,
            recipient2_email=invite.recipient2_email,
            recipient2_phone=invite.recipient2_phone,
            created_by=creator.Uuid,  # Store UUID in database
            expires_at=expires_at
        )
        
        session.add(new_invite)
        session.commit()
        session.refresh(new_invite)
        
        # Send notifications to both recipients
        notification_results = {
            "recipient1": send_invite_notification(
                recipient_username=invite.recipient1_username,
                recipient_email=invite.recipient1_email,
                recipient_phone=invite.recipient1_phone,
                invite_code=code,
                creator_username=creator.Username,
                creator_uuid=creator.Uuid,  # Use actual UUID
                invite_id=new_invite.id,
                session=session
            ),
            "recipient2": send_invite_notification(
                recipient_username=invite.recipient2_username,
                recipient_email=invite.recipient2_email,
                recipient_phone=invite.recipient2_phone,
                invite_code=code,
                creator_username=creator.Username,
                creator_uuid=creator.Uuid,  # Use actual UUID
                invite_id=new_invite.id,
                session=session
            )
        }
        
        return {
            "success": True,
            "invite_code": new_invite.code,
            "expires_at": new_invite.expires_at,
            "notifications": notification_results
        }


def send_acceptance_notification(
    recipient_username: Optional[str],
    recipient_email: Optional[str],
    recipient_phone: Optional[str],
    accepting_user: Users,
    invite_code: str,
    session
) -> bool:
    """
    Helper function to send acceptance notification via the appropriate channel
    
    Returns:
        True if notification was sent, False otherwise
    """
    # Priority 1: In-app notification
    if recipient_username:
        recipient = session.exec(
            select(Users).where(Users.Username == recipient_username)
        ).first()
        if recipient:
            try:
                create_notification(
                    session=session,
                    user_uuid=recipient.Uuid,
                    type="invite_accepted",
                    title="Invite Accepted",
                    message=f"{accepting_user.Username} has accepted the connection invite",
                    from_user_uuid=accepting_user.Uuid,
                    related_id=None,
                    action_url=f"/invites/check/{invite_code}"
                )
                return True
            except Exception as e:
                logger.error(f"Failed to send acceptance notification: {str(e)}")
        return False
    
    # Priority 2: Email
    if recipient_email:
        try:
            email_result = send_notification_email(
                to_email=recipient_email,
                notification_type="invite_accepted",
                message=f"Your invite has been accepted! Check {BASE_URL}/invite/{invite_code} for details.",
                from_username=accepting_user.Username,
                action_url=f"{BASE_URL}/invite/{invite_code}"
            )
            return email_result["success"]
        except Exception as e:
            logger.error(f"Exception sending acceptance email: {str(e)}")
        return False
    
    # Priority 3: SMS
    if recipient_phone:
        try:
            sms_result = send_notification_sms(
                to_phone=recipient_phone,
                notification_type="invite_accepted",
                message=f"Your invite has been accepted! Check {BASE_URL}/invite/{invite_code}",
                from_username=accepting_user.Username
            )
            return sms_result["success"]
        except Exception as e:
            logger.error(f"Exception sending acceptance SMS: {str(e)}")
        return False
    
    return False


@router.post("/accept")
async def accept_invite(accept: InviteLinkAccept, user_uuid: str):
    """
    Accept an invite link. Once both recipients accept, a thread is created.
    Sends notifications to the other recipient when accepted.
    """
    if accept.recipient_number not in [1, 2]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="recipient_number must be 1 or 2"
        )
    
    with Session(engine) as session:
        # Get invite
        invite = session.exec(
            select(InviteLinks).where(InviteLinks.code == accept.code)
        ).first()
        
        if not invite:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invite code not found"
            )
        
        # Check expiration
        if invite.expires_at:
            expires = datetime.fromisoformat(invite.expires_at)
            if datetime.utcnow() > expires:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invite link has expired"
                )
        
        # Get user
        user = session.get(Users, user_uuid)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify user matches recipient info and track other recipient
        other_recipient_username = None
        other_recipient_email = None
        other_recipient_phone = None
        
        if accept.recipient_number == 1:
            if invite.recipient1_accepted == 1:
                return {"success": False, "message": "Recipient 1 has already accepted"}
            
            # Check if user matches any recipient1 identifier
            matches = (
                (invite.recipient1_username and user.Username == invite.recipient1_username) or
                (invite.recipient1_email and user.Email == invite.recipient1_email) or
                (invite.recipient1_phone and user.phone == invite.recipient1_phone)
            )
            if not matches:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User does not match recipient 1 information"
                )
            
            invite.recipient1_accepted = 1
            other_recipient_username = invite.recipient2_username
            other_recipient_email = invite.recipient2_email
            other_recipient_phone = invite.recipient2_phone
        else:  # recipient_number == 2
            if invite.recipient2_accepted == 1:
                return {"success": False, "message": "Recipient 2 has already accepted"}
            
            matches = (
                (invite.recipient2_username and user.Username == invite.recipient2_username) or
                (invite.recipient2_email and user.Email == invite.recipient2_email) or
                (invite.recipient2_phone and user.phone == invite.recipient2_phone)
            )            
            if not matches:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User does not match recipient 2 information"
                )
            
            invite.recipient2_accepted = 1
            other_recipient_username = invite.recipient1_username
            other_recipient_email = invite.recipient1_email
            other_recipient_phone = invite.recipient1_phone
        
        session.add(invite)
        session.commit()
        
        # Notify the other recipient that this user has accepted
        notification_sent = send_acceptance_notification(
            recipient_username=other_recipient_username,
            recipient_email=other_recipient_email,
            recipient_phone=other_recipient_phone,
            accepting_user=user,
            invite_code=invite.code,
            session=session
        )
        
        # If both accepted, create thread
        if invite.recipient1_accepted == 1 and invite.recipient2_accepted == 1 and not invite.thread_id:
            # Get both users
            user1_stmt = select(Users).where(
                (Users.Username == invite.recipient1_username) |
                (Users.Email == invite.recipient1_email) |
                (Users.phone == invite.recipient1_phone)
            )
            user1 = session.exec(user1_stmt).first()
            
            user2_stmt = select(Users).where(
                (Users.Username == invite.recipient2_username) |
                (Users.Email == invite.recipient2_email) |
                (Users.phone == invite.recipient2_phone)
            )
            user2 = session.exec(user2_stmt).first()
            
            if user1 and user2:
                # Create thread
                new_thread = Threads(
                    is_group=False,
                    created_by=invite.created_by
                )
                session.add(new_thread)
                session.commit()
                session.refresh(new_thread)
                
                # Add participants
                participant1 = ThreadParticipants(
                    thread_id=new_thread.id,
                    user_uuid=user1.Uuid,
                    visible=1
                )
                participant2 = ThreadParticipants(
                    thread_id=new_thread.id,
                    user_uuid=user2.Uuid,
                    visible=1
                )
                session.add(participant1)
                session.add(participant2)
                
                # Link invite to thread
                invite.thread_id = new_thread.id
                session.add(invite)
                session.commit()
                
                # Notify both users that the thread was created (in-app only)
                try:
                    create_notification(
                        session=session,
                        user_uuid=user1.Uuid,
                        type="thread_created",
                        title="Connection Established",
                        message=f"You're now connected with {user2.Username}",
                        from_user_uuid=user2.Uuid,
                        related_id=new_thread.id,
                        action_url=f"/threads/{new_thread.id}"
                    )
                except Exception as e:
                    logger.error(f"Failed to send thread creation notification to user1: {str(e)}")
                
                try:
                    create_notification(
                        session=session,
                        user_uuid=user2.Uuid,
                        type="thread_created",
                        title="Connection Established",
                        message=f"You're now connected with {user1.Username}",
                        from_user_uuid=user1.Uuid,
                        related_id=new_thread.id,
                        action_url=f"/threads/{new_thread.id}"
                    )
                except Exception as e:
                    logger.error(f"Failed to send thread creation notification to user2: {str(e)}")
                
                return {
                    "success": True,
                    "message": "Both recipients accepted. Thread created.",
                    "thread_id": new_thread.id
                }
        
        return {
            "success": True,
            "message": f"Recipient {accept.recipient_number} accepted. Waiting for other recipient.",
            "both_accepted": False,
            "notification_sent": notification_sent
        }


@router.get("/check/{code}")
async def check_invite_status(code: str):
    """Check the status of an invite link"""
    with Session(engine) as session:
        invite = session.exec(
            select(InviteLinks).where(InviteLinks.code == code)
        ).first()
        
        if not invite:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invite not found"
            )
        
        return {
            "success": True,
            "code": invite.code,
            "recipient1_accepted": bool(invite.recipient1_accepted),
            "recipient2_accepted": bool(invite.recipient2_accepted),
            "thread_created": invite.thread_id is not None,
            "thread_id": invite.thread_id,
            "expires_at": invite.expires_at
        }


@router.post("/resend/{code}")
async def resend_invite(code: str, recipient_number: int):
    """
    Resend an invite notification to a specific recipient
    Useful if the initial notification failed or was missed
    """
    if recipient_number not in [1, 2]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="recipient_number must be 1 or 2"
        )
    
    with Session(engine) as session:
        invite = session.exec(
            select(InviteLinks).where(InviteLinks.code == code)
        ).first()
        
        if not invite:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invite not found"
            )
        
        # Check if already accepted
        if recipient_number == 1 and invite.recipient1_accepted:
            return {"success": False, "message": "Recipient has already accepted"}
        if recipient_number == 2 and invite.recipient2_accepted:
            return {"success": False, "message": "Recipient has already accepted"}
        
        # Get creator info
        creator = session.get(Users, invite.created_by)
        creator_username = creator.Username if creator else None
        
        # Resend based on recipient
        if recipient_number == 1:
            result = send_invite_notification(
                recipient_username=invite.recipient1_username,
                recipient_email=invite.recipient1_email,
                recipient_phone=invite.recipient1_phone,
                invite_code=code,
                creator_username=creator_username,
                creator_uuid=invite.created_by,
                invite_id=invite.id,
                session=session
            )
        else:  # recipient_number == 2
            result = send_invite_notification(
                recipient_username=invite.recipient2_username,
                recipient_email=invite.recipient2_email,
                recipient_phone=invite.recipient2_phone,
                invite_code=code,
                creator_username=creator_username,
                creator_uuid=invite.created_by,
                invite_id=invite.id,
                session=session
            )
        
        if result["sent"]:
            return {
                "success": True,
                "message": f"Notification resent via {result['method']}"
            }
        else:
            return {
                "success": False,
                "message": "Failed to resend notification",
                "error": result.get("error")
            }


@router.get("/pending/{user_uuid}")
async def get_pending_invites(user_uuid: str):
    """
    Get all pending external invites created by a user.
    Returns invites where at least one recipient is external (email/phone)
    and hasn't been accepted yet.
    
    This is useful for showing a "Pending Invitations" section in the UI.
    """
    with Session(engine) as session:
        # Verify user exists
        user = session.get(Users, user_uuid)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get all invites created by this user
        invites = session.exec(
            select(InviteLinks).where(InviteLinks.created_by == user_uuid)
        ).all()
        
        pending_invites = []
        current_time = datetime.utcnow()
        
        for invite in invites:
            # Skip if both recipients have accepted
            if invite.recipient1_accepted == 1 and invite.recipient2_accepted == 1:
                continue
            
            # Check expiration
            is_expired = False
            if invite.expires_at:
                try:
                    expires = datetime.fromisoformat(invite.expires_at)
                    is_expired = current_time > expires
                except:
                    pass
            
            # Determine which recipient is external (not the creator)
            # The creator is typically recipient1, so we look at recipient2
            external_recipients = []
            
            # Check recipient 1 (if not accepted and is external)
            if invite.recipient1_accepted != 1:
                if invite.recipient1_email:
                    external_recipients.append({
                        "recipient_number": 1,
                        "type": "email",
                        "value": invite.recipient1_email,
                        "accepted": False
                    })
                elif invite.recipient1_phone:
                    external_recipients.append({
                        "recipient_number": 1,
                        "type": "phone",
                        "value": invite.recipient1_phone,
                        "accepted": False
                    })
                elif invite.recipient1_username and invite.recipient1_username != user.Username:
                    # Platform user (non-external) - include for completeness
                    external_recipients.append({
                        "recipient_number": 1,
                        "type": "username",
                        "value": invite.recipient1_username,
                        "accepted": False
                    })
            
            # Check recipient 2 (if not accepted and is external)
            if invite.recipient2_accepted != 1:
                if invite.recipient2_email:
                    external_recipients.append({
                        "recipient_number": 2,
                        "type": "email",
                        "value": invite.recipient2_email,
                        "accepted": False
                    })
                elif invite.recipient2_phone:
                    external_recipients.append({
                        "recipient_number": 2,
                        "type": "phone",
                        "value": invite.recipient2_phone,
                        "accepted": False
                    })
                elif invite.recipient2_username and invite.recipient2_username != user.Username:
                    # Platform user (non-external) - include for completeness
                    external_recipients.append({
                        "recipient_number": 2,
                        "type": "username",
                        "value": invite.recipient2_username,
                        "accepted": False
                    })
            
            # Only include invites with external recipients
            if external_recipients:
                pending_invites.append({
                    "invite_code": invite.code,
                    "created_at": invite.created_at.isoformat() if hasattr(invite.created_at, 'isoformat') else str(invite.created_at),
                    "expires_at": invite.expires_at,
                    "is_expired": is_expired,
                    "recipients": external_recipients,
                    "thread_created": invite.thread_id is not None,
                    "thread_id": invite.thread_id
                })
        
        return {
            "success": True,
            "pending_invites": pending_invites,
            "count": len(pending_invites)
        }