# Feature Flags for GrowPath Pricing & Permissions

# User Roles

# - user: Free or Pro Grower

# - creator: Creator Plus

# - commercial: Commercial Partner

# - facility: Facility

# - admin: Admin

# User Plans

# - free

# - pro

# - creator_plus

# - commercial

# - facility

# Feature Flags (plan-based, backend-enforced)

FEATURE_FLAGS = { # Course System
'can_create_courses': ['free', 'pro', 'creator_plus', 'commercial', 'facility'],
'max_paid_courses': {
'free': 1,
'pro': 3, # or 3-5
'creator_plus': None, # unlimited
'commercial': None,
'facility': None
},
'max_lessons_per_course': {
'free': 7,
'pro': 20,
'creator_plus': None,
'commercial': None,
'facility': None
},
'can_issue_certificates': ['creator_plus', 'commercial', 'facility'],
'course_analytics': {
'free': False,
'pro': 'basic',
'creator_plus': 'advanced',
'commercial': 'advanced',
'facility': 'advanced'
},
'education_feed_boost': {
'free': 0,
'pro': 1,
'creator_plus': 2,
'commercial': 2,
'facility': 2
},
'course_approval_required': ['free', 'pro'],

    # Grow Tools
    'soil_calculator': ['free', 'pro', 'creator_plus', 'commercial', 'facility'],
    'npk_calculator': ['free', 'pro', 'creator_plus', 'commercial', 'facility'],
    'vpd_tool': ['free', 'pro', 'creator_plus', 'commercial', 'facility'],
    'feed_scheduler': ['pro', 'creator_plus', 'commercial', 'facility'],
    'harvest_estimator': ['pro', 'creator_plus', 'commercial', 'facility'],
    'timeline_planner': ['pro', 'creator_plus', 'commercial', 'facility'],
    'pdf_export': ['pro', 'creator_plus', 'commercial', 'facility'],

    # Commercial/Facility Only
    'can_post_offers': ['commercial'],
    'can_advertise_products': ['commercial'],
    'can_capture_leads': ['commercial'],
    'facility_dashboard': ['facility'],
    'compliance_tools': ['facility'],
    'team_roles': ['facility'],
    'sops': ['facility'],
    'audit_logs': ['facility'],
    'metrc_integration': ['facility'],
    'task_verification': ['facility'],
    'operational_analytics': ['facility'],
    'pheno_matrix': ['pro', 'creator_plus', 'commercial', 'facility'],

}

# Usage Example (Python pseudocode):

# if user.plan in FEATURE_FLAGS['can_create_courses']:

# show_course_creation_ui()

# if FEATURE_FLAGS['max_paid_courses'][user.plan] is not None:

# enforce_course_limit(FEATURE_FLAGS['max_paid_courses'][user.plan])
