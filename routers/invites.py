from fastapi import APIRouter, HTTPException, status
from models.schemas import InviteLinkCreate, InviteLinkAccept
from models.database import InviteLinks, Users, Threads, ThreadParticipants
from db import Session, engine, select
from datetime import datetime, timedelta
import secrets
import string

router = APIRouter(prefix="/invites", tags=["invites"])

def generate_invite_code(length: int = 8) -> str:
    """Generate a random alphanumeric invite code"""
    characters = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(characters) for _ in range(length))

@router.post("/create")
async def create_invite_link(invite: InviteLinkCreate, created_by: str):
    """
    Create a new invite link to connect two recipients.
    At least one identifier (username, email, or phone) is required for each recipient.
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
        # Verify creator exists
        creator = session.get(Users, created_by)
        if not creator:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Creator user not found"
            )
        
        # Generate unique code
        code = generate_invite_code()
        while session.exec(select(InviteLinks).where(InviteLinks.code == code)).first():
            code = generate_invite_code()
        
        # Calculate expiration
        expires_at = None
        if invite.expires_in_hours:
            expires_at = (datetime.utcnow() + timedelta(hours=invite.expires_in_hours)).isoformat()
        
        # Create invite
        new_invite = InviteLinks(
            code=code,
            recipient1_username=invite.recipient1_username,
            recipient1_email=invite.recipient1_email,
            recipient1_phone=invite.recipient1_phone,
            recipient2_username=invite.recipient2_username,
            recipient2_email=invite.recipient2_email,
            recipient2_phone=invite.recipient2_phone,
            created_by=created_by,
            expires_at=expires_at
        )
        
        session.add(new_invite)
        session.commit()
        session.refresh(new_invite)
        
        return {
            "success": True,
            "invite_code": new_invite.code,
            "expires_at": new_invite.expires_at
        }

@router.post("/accept")
async def accept_invite(accept: InviteLinkAccept, user_uuid: str):
    """
    Accept an invite link. Once both recipients accept, a thread is created.
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
        
        # Verify user matches recipient info
        if accept.recipient_number == 1:
            if invite.recipient1_accepted == 1:
                return {"success": False, "message": "Recipient 1 has already accepted"}
            
            # Check if user matches any recipient1 identifier
            matches = (
                (invite.recipient1_username and user.Username == invite.recipient1_username) or
                (invite.recipient1_email and user.Email == invite.recipient1_email) or
                (invite.recipient1_phone and user.phone == invite.recipient1_phone)  # Add phone matching
            )
            if not matches:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User does not match recipient 1 information"
                )
            
            invite.recipient1_accepted = 1
        else:  # recipient_number == 2
            if invite.recipient2_accepted == 1:
                return {"success": False, "message": "Recipient 2 has already accepted"}
            
            matches = (
                (invite.recipient2_username and user.Username == invite.recipient2_username) or
                (invite.recipient2_email and user.Email == invite.recipient2_email) or
                (invite.recipient2_phone and user.phone == invite.recipient2_phone)  # Add phone matching
            )            
            if not matches:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User does not match recipient 2 information"
                )
            
            invite.recipient2_accepted = 1
        
        session.add(invite)
        session.commit()
        
        # If both accepted, create thread
        if invite.recipient1_accepted == 1 and invite.recipient2_accepted == 1 and not invite.thread_id:
            # Get both users
            user1_stmt = select(Users).where(
                (Users.Username == invite.recipient1_username) |
                (Users.Email == invite.recipient1_email)
            )
            user1 = session.exec(user1_stmt).first()
            
            user2_stmt = select(Users).where(
                (Users.Username == invite.recipient2_username) |
                (Users.Email == invite.recipient2_email)
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
                
                return {
                    "success": True,
                    "message": "Both recipients accepted. Thread created.",
                    "thread_id": new_thread.id
                }
        
        return {
            "success": True,
            "message": f"Recipient {accept.recipient_number} accepted. Waiting for other recipient.",
            "both_accepted": False
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
