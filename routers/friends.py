from fastapi import APIRouter, HTTPException, status
from db import Session, engine, select
from sqlalchemy import or_, and_
from database.operations import execute_statement
from models.database import Users, FriendRequest, Notification
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

from sqlmodel import SQLModel, Field

# Request schemas
class SendFriendRequestSchema(BaseModel):
    requester_username: str
    recipient_username: str

class RespondToRequestSchema(BaseModel):
    request_id: int
    username: str
    action: str

router = APIRouter(prefix="/friends", tags=["friends"])

# Helper function to create notifications
def create_notification(session, user_uuid: str, type: str, title: str, message: str, 
                       from_user_uuid: Optional[str] = None, related_id: Optional[int] = None):
    notification = Notification(
        user_uuid=user_uuid,
        type=type,
        title=title,
        message=message,
        from_user_uuid=from_user_uuid,
        related_id=related_id
    )
    session.add(notification)
    return notification

@router.post("/search")
async def search_users(query: str):
    """Search for users by username (case-insensitive, partial match)"""
    if not query or len(query.strip()) < 2:
        return {
            "success": False,
            "error": "Search query must be at least 2 characters"
        }
    
    with Session(engine) as session:
        stmt = select(Users).where(
            Users.Username.ilike(f"%{query}%")
        ).limit(20)
        
        results = session.exec(stmt).all()
        
        users_list = [
            {
                "uuid": user.Uuid,
                "username": user.Username,
                "active": bool(user.active)
            }
            for user in results
        ]
        
        return {
            "success": True,
            "count": len(users_list),
            "users": users_list
        }

@router.get("/relationship-status")
async def get_relationship_status(username: str, other_username: str):
    """
    Get the friendship status between two users
    Returns: 'none', 'pending_sent', 'pending_received', 'friends'
    """
    with Session(engine) as session:
        user = session.exec(
            select(Users).where(Users.Username == username)
        ).first()
        
        other_user = session.exec(
            select(Users).where(Users.Username == other_username)
        ).first()
        
        if not user or not other_user:
            return {
                "success": False,
                "error": "User not found"
            }
        
        # Check for existing friend request
        existing = session.exec(
            select(FriendRequest).where(
                or_(
                    and_(
                        FriendRequest.requester_uuid == user.Uuid,
                        FriendRequest.recipient_uuid == other_user.Uuid
                    ),
                    and_(
                        FriendRequest.requester_uuid == other_user.Uuid,
                        FriendRequest.recipient_uuid == user.Uuid
                    )
                )
            )
        ).first()
        
        if not existing:
            status = "none"
        elif existing.status == "accepted":
            status = "friends"
        elif existing.status == "pending":
            if existing.requester_uuid == user.Uuid:
                status = "pending_sent"
            else:
                status = "pending_received"
        else:
            status = "none"
        
        return {
            "success": True,
            "status": status,
            "request_id": existing.id if existing else None
        }

@router.post("/request/send")
async def send_friend_request(request: SendFriendRequestSchema):
    """Send a friend request from one user to another"""
    if not request.requester_username or not request.recipient_username:
        return {
            "success": False,
            "error": "Both usernames are required"
        }
    
    if request.requester_username == request.recipient_username:
        return {
            "success": False,
            "error": "Cannot send friend request to yourself"
        }
    
    with Session(engine) as session:
        requester = session.exec(
            select(Users).where(Users.Username == request.requester_username)
        ).first()
        
        recipient = session.exec(
            select(Users).where(Users.Username == request.recipient_username)
        ).first()
        
        if not requester or not recipient:
            return {
                "success": False,
                "error": "One or both users not found"
            }
        
        # Check if already friends or request exists
        existing = session.exec(
            select(FriendRequest).where(
                or_(
                    and_(
                        FriendRequest.requester_uuid == requester.Uuid,
                        FriendRequest.recipient_uuid == recipient.Uuid
                    ),
                    and_(
                        FriendRequest.requester_uuid == recipient.Uuid,
                        FriendRequest.recipient_uuid == requester.Uuid
                    )
                )
            )
        ).first()
        
        if existing:
            if existing.status == "accepted":
                return {
                    "success": False,
                    "error": "You are already friends"
                }
            elif existing.status == "pending":
                return {
                    "success": False,
                    "error": "Friend request already pending"
                }
            elif existing.status == "rejected":
                # Allow re-sending after rejection
                existing.status = "pending"
                existing.created_at = datetime.utcnow().isoformat()
                existing.responded_at = None
                session.add(existing)
                session.commit()
                
                # Create notification for recipient
                create_notification(
                    session=session,
                    user_uuid=recipient.Uuid,
                    type="friend_request",
                    title="New Friend Request",
                    message=f"{requester.Username} sent you a friend request",
                    from_user_uuid=requester.Uuid,
                    related_id=existing.id
                )
                session.commit()
                
                return {
                    "success": True,
                    "message": "Friend request re-sent",
                    "status": "pending_sent"
                }
        
        # Create new friend request
        new_request = FriendRequest(
            requester_uuid=requester.Uuid,
            recipient_uuid=recipient.Uuid,
            status="pending"
        )
        
        session.add(new_request)
        session.commit()
        session.refresh(new_request)
        
        # Create notification for recipient
        create_notification(
            session=session,
            user_uuid=recipient.Uuid,
            type="friend_request",
            title="New Friend Request",
            message=f"{requester.Username} sent you a friend request",
            from_user_uuid=requester.Uuid,
            related_id=new_request.id
        )
        session.commit()
        
        return {
            "success": True,
            "request_id": new_request.id,
            "message": f"Friend request sent to {recipient.Username}",
            "status": "pending_sent"
        }

@router.post("/request/respond")
async def respond_to_friend_request(request: RespondToRequestSchema):
    """Accept or reject a friend request"""
    if request.action not in ["accept", "reject"]:
        return {
            "success": False,
            "error": "Action must be 'accept' or 'reject'"
        }
    
    with Session(engine) as session:
        user = session.exec(
            select(Users).where(Users.Username == request.username)
        ).first()
        
        if not user:
            return {
                "success": False,
                "error": "User not found"
            }
        
        friend_request = session.exec(
            select(FriendRequest).where(FriendRequest.id == request.request_id)
        ).first()
        
        if not friend_request:
            return {
                "success": False,
                "error": "Friend request not found"
            }
        
        if friend_request.recipient_uuid != user.Uuid:
            return {
                "success": False,
                "error": "You can only respond to requests sent to you"
            }
        
        if friend_request.status != "pending":
            return {
                "success": False,
                "error": f"Request already {friend_request.status}"
            }
        
        # Update the request
        friend_request.status = "accepted" if request.action == "accept" else "rejected"
        friend_request.responded_at = datetime.utcnow().isoformat()
        session.add(friend_request)
        
        # If accepted, create notification for requester
        if request.action == "accept":
            requester = session.exec(
                select(Users).where(Users.Uuid == friend_request.requester_uuid)
            ).first()
            
            if requester:
                create_notification(
                    session=session,
                    user_uuid=friend_request.requester_uuid,
                    type="friend_accepted",
                    title="Friend Request Accepted",
                    message=f"{user.Username} accepted your friend request",
                    from_user_uuid=user.Uuid,
                    related_id=friend_request.id
                )
        
        session.commit()
        
        return {
            "success": True,
            "message": f"Friend request {request.action}ed",
            "status": "friends" if request.action == "accept" else "none"
        }

@router.get("/requests/pending")
async def get_pending_requests(username: str):
    """Get all pending friend requests for a user (both sent and received)"""
    with Session(engine) as session:
        user = session.exec(
            select(Users).where(Users.Username == username)
        ).first()
        
        if not user:
            return {
                "success": False,
                "error": "User not found"
            }
        
        # Get received requests
        received_stmt = select(FriendRequest).where(
            and_(
                FriendRequest.recipient_uuid == user.Uuid,
                FriendRequest.status == "pending"
            )
        )
        received_requests = session.exec(received_stmt).all()
        
        # Get sent requests
        sent_stmt = select(FriendRequest).where(
            and_(
                FriendRequest.requester_uuid == user.Uuid,
                FriendRequest.status == "pending"
            )
        )
        sent_requests = session.exec(sent_stmt).all()
        
        # Build response with usernames
        received_list = []
        for req in received_requests:
            requester = session.exec(
                select(Users).where(Users.Uuid == req.requester_uuid)
            ).first()
            received_list.append({
                "request_id": req.id,
                "from_username": requester.Username if requester else "Unknown",
                "created_at": req.created_at
            })
        
        sent_list = []
        for req in sent_requests:
            recipient = session.exec(
                select(Users).where(Users.Uuid == req.recipient_uuid)
            ).first()
            sent_list.append({
                "request_id": req.id,
                "to_username": recipient.Username if recipient else "Unknown",
                "created_at": req.created_at
            })
        
        return {
            "success": True,
            "received": received_list,
            "sent": sent_list
        }

@router.get("/list")
async def get_friends_list(username: str):
    """Get all friends for a user (accepted friend requests)"""
    with Session(engine) as session:
        user = session.exec(
            select(Users).where(Users.Username == username)
        ).first()
        
        if not user:
            return {
                "success": False,
                "error": "User not found"
            }
        
        stmt = select(FriendRequest).where(
            and_(
                or_(
                    FriendRequest.requester_uuid == user.Uuid,
                    FriendRequest.recipient_uuid == user.Uuid
                ),
                FriendRequest.status == "accepted"
            )
        )
        
        friend_requests = session.exec(stmt).all()
        
        friends_list = []
        for req in friend_requests:
            friend_uuid = (
                req.recipient_uuid 
                if req.requester_uuid == user.Uuid 
                else req.requester_uuid
            )
            
            friend = session.exec(
                select(Users).where(Users.Uuid == friend_uuid)
            ).first()
            
            if friend:
                friends_list.append({
                    "uuid": friend.Uuid,
                    "username": friend.Username,
                    "active": bool(friend.active),
                    "friends_since": req.responded_at or req.created_at
                })
        
        return {
            "success": True,
            "count": len(friends_list),
            "friends": friends_list
        }

@router.delete("/remove")
async def remove_friend(username: str, friend_username: str):
    """Remove a friend (delete the accepted friend request)"""
    with Session(engine) as session:
        user = session.exec(
            select(Users).where(Users.Username == username)
        ).first()
        
        friend = session.exec(
            select(Users).where(Users.Username == friend_username)
        ).first()
        
        if not user or not friend:
            return {
                "success": False,
                "error": "User not found"
            }
        
        stmt = select(FriendRequest).where(
            or_(
                and_(
                    FriendRequest.requester_uuid == user.Uuid,
                    FriendRequest.recipient_uuid == friend.Uuid
                ),
                and_(
                    FriendRequest.requester_uuid == friend.Uuid,
                    FriendRequest.recipient_uuid == user.Uuid
                )
            ),
            FriendRequest.status == "accepted"
        )
        
        friendship = session.exec(stmt).first()
        
        if not friendship:
            return {
                "success": False,
                "error": "You are not friends with this user"
            }
        
        session.delete(friendship)
        session.commit()
        
        return {
            "success": True,
            "message": f"Removed {friend_username} from friends",
            "status": "none"
        }
