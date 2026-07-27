from app.guardian.schemas import GuardianReview, GuardianReviewRequest

EXTERNAL_ACTIONS = {"send_email", "update_calendar", "post_message", "book_travel"}
DESTRUCTIVE_ACTIONS = {"delete_file", "cancel_booking", "delete_event"}
SAFETY_ALERTS = {"nearby_emergency_alert", "weather_alert", "traffic_accident_alert", "travel_guardian_check"}
CAREER_ACTIONS = {"career_recommendation", "suggest_job_search", "update_growth_plan"}
CAPTURE_ACTIONS = {"capture_memory", "summarize_youtube", "summarize_notes"}
CONSENT_ACTIONS = {"record_meeting"}


def review_action(payload: GuardianReviewRequest) -> GuardianReview:
    action_type = payload.action_type

    if action_type in DESTRUCTIVE_ACTIONS:
        return GuardianReview(
            decision="block",
            risk_level="blocked",
            approval_required=True,
            reason="This action is destructive and is blocked in the MVP.",
            safe_alternative="Create a draft recommendation for the user instead.",
        )

    if action_type in EXTERNAL_ACTIONS:
        return GuardianReview(
            decision="require_approval",
            risk_level="medium",
            approval_required=True,
            reason="This action changes an external system or communicates on behalf of the user.",
            safe_alternative="Prepare the action as a draft before execution.",
        )

    if action_type in SAFETY_ALERTS:
        return GuardianReview(
            decision="allow",
            risk_level="low",
            approval_required=False,
            reason="Safety alerts may be delivered when relevant to the user's city, route, or calendar.",
        )

    if action_type in CAREER_ACTIONS:
        return GuardianReview(
            decision="allow",
            risk_level="low",
            approval_required=False,
            reason="Career recommendations are read-only and do not contact employers or modify external profiles.",
        )

    if action_type in CONSENT_ACTIONS:
        return GuardianReview(
            decision="require_approval",
            risk_level="medium",
            approval_required=True,
            reason="Meeting recording or storage can include other people's private information, so consent must be confirmed first.",
            safe_alternative="Use pasted notes or a transcript after confirming everyone agreed.",
        )

    if action_type in CAPTURE_ACTIONS:
        return GuardianReview(
            decision="allow",
            risk_level="low",
            approval_required=False,
            reason="Capture analysis is read-only and stores a summary for the user's memory.",
        )

    return GuardianReview(
        decision="allow",
        risk_level="low",
        approval_required=False,
        reason="Read-only insight with no external side effects.",
    )
