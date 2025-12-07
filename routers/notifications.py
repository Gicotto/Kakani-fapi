from fastapi import APIRouter, HTTPException, status
from db import Session, engine, select
from sqlalchemy import and_, or_, desc
from models.database import Users, Notification
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

router = APIRouter(prefix="/notifications", tags=["notifications"])

# Request schemas
class MarkAsReadSchema(BaseModel):
    notification_ids: List[int]

class CreateNotificationSchema(BaseModel):
    user_uuid: str
    type: str
    title: str
    message: str
    from_user_uuid: Optional[str] = None
    related_id: Optional[int] = None
    action_url: Optional[str] = None


# Helper function to create notifications (can be called from other routes)
def create_notification(
    session,
    user_uuid: str,
    type: str,
    title: str,
    message: str,
    from_user_uuid: Optional[str] = None,
    related_id: Optional[int] = None,
    action_url: Optional[str] = None
):
    """Helper function to create a notification"""
    notification = Notification(
        user_uuid=user_uuid,
        type=type,
        title=title,
        message=message,
        from_user_uuid=from_user_uuid,
        related_id=related_id,
        action_url=action_url
    )
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification


@router.get("/")
async def get_notifications(username: str, limit: int = 20, unread_only: bool = False):
    """
    Get notifications for a user
    """
    with Session(engine) as session:
        # Get user
        user = session.exec(
            select(Users).where(Users.Username == username)
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Build query
        stmt = select(Notification).where(Notification.user_uuid == user.Uuid)
        
        if unread_only:
            stmt = stmt.where(Notification.is_read == 0)
        
        stmt = stmt.order_by(desc(Notification.created_at)).limit(limit)
        
        notifications = session.exec(stmt).all()
        
        # Format response with sender info
        notifications_list = []
        for notif in notifications:
            notif_dict = {
                "id": notif.id,
                "type": notif.type,
                "title": notif.title,
                "message": notif.message,
                "is_read": bool(notif.is_read),
                "created_at": notif.created_at,
                "action_url": notif.action_url,
                "related_id": notif.related_id,
            }
            
            # Get sender info if available
            if notif.from_user_uuid:
                sender = session.exec(
                    select(Users).where(Users.Uuid == notif.from_user_uuid)
                ).first()
                if sender:
                    notif_dict["from_username"] = sender.Username
            
            notifications_list.append(notif_dict)
        
        return {
            "success": True,
            "notifications": notifications_list,
            "count": len(notifications_list)
        }


@router.get("/unread-count")
async def get_unread_count(username: str):
    """
    Get count of unread notifications for a user
    """
    with Session(engine) as session:
        # Get user
        user = session.exec(
            select(Users).where(Users.Username == username)
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Count unread notifications
        stmt = select(Notification).where(
            and_(
                Notification.user_uuid == user.Uuid,
                Notification.is_read == 0
            )
        )
        
        unread_notifications = session.exec(stmt).all()
        
        return {
            "success": True,
            "unread_count": len(unread_notifications)
        }


@router.post("/mark-read")
async def mark_notifications_as_read(request: MarkAsReadSchema):
    """
    Mark one or more notifications as read
    """
    with Session(engine) as session:
        for notif_id in request.notification_ids:
            notification = session.exec(
                select(Notification).where(Notification.id == notif_id)
            ).first()
            
            if notification:
                notification.is_read = 1
                session.add(notification)
        
        session.commit()
        
        return {
            "success": True,
            "message": f"Marked {len(request.notification_ids)} notification(s) as read"
        }


@router.post("/mark-all-read")
async def mark_all_as_read(username: str):
    """
    Mark all notifications as read for a user
    """
    with Session(engine) as session:
        # Get user
        user = session.exec(
            select(Users).where(Users.Username == username)
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get all unread notifications
        stmt = select(Notification).where(
            and_(
                Notification.user_uuid == user.Uuid,
                Notification.is_read == 0
            )
        )
        
        notifications = session.exec(stmt).all()
        
        for notification in notifications:
            notification.is_read = 1
            session.add(notification)
        
        session.commit()
        
        return {
            "success": True,
            "message": f"Marked {len(notifications)} notification(s) as read"
        }


@router.delete("/{notification_id}")
async def delete_notification(notification_id: int, username: str):
    """
    Delete a specific notification
    """
    with Session(engine) as session:
        # Get user
        user = session.exec(
            select(Users).where(Users.Username == username)
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get notification
        notification = session.exec(
            select(Notification).where(Notification.id == notification_id)
        ).first()
        
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        # Verify ownership
        if notification.user_uuid != user.Uuid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own notifications"
            )
        
        session.delete(notification)
        session.commit()
        
        return {
            "success": True,
            "message": "Notification deleted"
        }


@router.post("/create")
async def create_notification_route(request: CreateNotificationSchema):
    """
    Create a new notification (typically called by other backend services)
    """
    with Session(engine) as session:
        notification = create_notification(
            session=session,
            user_uuid=request.user_uuid,
            type=request.type,
            title=request.title,
            message=request.message,
            from_user_uuid=request.from_user_uuid,
            related_id=request.related_id,
            action_url=request.action_url
        )
        
        return {
            "success": True,
            "notification_id": notification.id,
            "message": "Notification created"
        }
