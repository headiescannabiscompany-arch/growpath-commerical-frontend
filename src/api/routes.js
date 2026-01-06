// Centralized API Route Map
const PREFIX = "/api";

export const ROUTES = {
  AUTH: {
    LOGIN: `${PREFIX}/auth/login`,
    SIGNUP: `${PREFIX}/auth/signup`,
    BECOME_CREATOR: `${PREFIX}/auth/become-creator`
  },
  TASKS: {
    TODAY: `${PREFIX}/tasks/today`,
    UPCOMING: `${PREFIX}/tasks/upcoming`,
    LIST: `${PREFIX}/tasks`,
    COMPLETE: (id) => `${PREFIX}/tasks/${id}/complete`,
    REOPEN: (id) => `${PREFIX}/tasks/${id}/reopen`,
    DELETE: (id) => `${PREFIX}/tasks/${id}`
  },
  GROWS: {
    LIST: `${PREFIX}/grows`,
    CREATE: `${PREFIX}/grows`,
    ENTRIES: (id) => `${PREFIX}/grows/${id}/entries`,
    ENTRY_PHOTO: (id) => `${PREFIX}/grows/${id}/entries/photo`,
    ADD_PLANT: (id) => `${PREFIX}/grows/${id}/plants`
  },
  PLANTS: {
    LIST: `${PREFIX}/plants`,
    CREATE: `${PREFIX}/plants`,
    UPLOAD_PHOTO: `${PREFIX}/plants/upload-photo`,
    DETAIL: (id) => `${PREFIX}/plants/${id}`,
    LOGS: (id) => `${PREFIX}/plants/${id}/logs`,
    STATS: (id) => `${PREFIX}/plants/${id}/stats`,
    EXPORT_PDF: (id) => `${PREFIX}/plants/${id}/export`
  },
  USER: {
    PROFILE: (id) => `${PREFIX}/user/profile/${id}`,
    AVATAR: `${PREFIX}/user/avatar`,
    BANNER: `${PREFIX}/user/banner`,
    BIO: `${PREFIX}/user/bio`,
    FOLLOW: (id) => `${PREFIX}/user/follow/${id}`,
    UNFOLLOW: (id) => `${PREFIX}/user/unfollow/${id}`,
    IS_FOLLOWING: (id) => `${PREFIX}/user/is-following/${id}`,
    FOLLOWERS: (id) => `${PREFIX}/user/followers/${id}`,
    FOLLOWING: (id) => `${PREFIX}/user/following/${id}`,
    NOTIFICATIONS: `${PREFIX}/user/preferences/notifications`,
    CERTIFICATES: `${PREFIX}/user/certificates`,
    ONBOARD_CREATOR: `${PREFIX}/user/creator/onboard`
  },
  FORUM: {
    LIST: `${PREFIX}/forum`,
    DETAIL: (id) => `${PREFIX}/forum/${id}`,
    FEED_LATEST: `${PREFIX}/forum/feed/latest`,
    FEED_TRENDING: `${PREFIX}/forum/feed/trending`,
    FEED_FOLLOWING: `${PREFIX}/forum/feed/following`,
    CREATE: `${PREFIX}/forum/create`,
    LEGACY_CREATE: `${PREFIX}/forum`,
    LIKE: (id) => `${PREFIX}/forum/like/${id}`,
    UNLIKE: (id) => `${PREFIX}/forum/unlike/${id}`,
    COMMENT: (id) => `${PREFIX}/forum/${id}/comment`,
    COMMENTS: (id) => `${PREFIX}/forum/${id}/comments`,
    COMMENT_DETAIL: (id) => `${PREFIX}/forum/comment/${id}`,
    SAVE: (id) => `${PREFIX}/forum/save/${id}`,
    UNSAVE: (id) => `${PREFIX}/forum/unsave/${id}`,
    REPORT: (id) => `${PREFIX}/forum/report/${id}`,
    TO_GROWLOG: (id) => `${PREFIX}/forum/to-growlog/${id}`
  },
  POSTS: {
    FEED: `${PREFIX}/posts/feed`,
    TRENDING: `${PREFIX}/posts/trending`,
    CREATE: `${PREFIX}/posts`,
    LIKE: (id) => `${PREFIX}/posts/${id}/like`,
    UNLIKE: (id) => `${PREFIX}/posts/${id}/unlike`,
    COMMENTS: (id) => `${PREFIX}/posts/${id}/comments`,
    COMMENT: (id) => `${PREFIX}/posts/${id}/comment`
  },
  COURSES: {
    LIST: `${PREFIX}/courses`,
    MINE: `${PREFIX}/courses/mine`,
    CREATE: `${PREFIX}/courses/create`,
    DETAIL: (id) => `${PREFIX}/courses/${id}`,
    LESSON: (id) => `${PREFIX}/courses/${id}/lesson`,
    LESSON_DETAIL: (id) => `${PREFIX}/courses/lesson/${id}`,
    PUBLISH: (id) => `${PREFIX}/courses/${id}/publish`,
    ENROLL: (id) => `${PREFIX}/courses/${id}/enroll`,
    BUY: (id) => `${PREFIX}/courses/${id}/buy`,
    STATUS: (id) => `${PREFIX}/courses/${id}/enrollment-status`,
    COMPLETE_LESSON: (id) => `${PREFIX}/courses/lesson/${id}/complete`,
    REVIEW: (id) => `${PREFIX}/courses/${id}/review`,
    REVIEWS: (id) => `${PREFIX}/courses/${id}/reviews`,
    SEARCH: `${PREFIX}/courses/search`,
    FILTER: `${PREFIX}/courses/filter`,
    CATEGORIES: `${PREFIX}/courses/categories`,
    CATEGORY_COURSES: (cat) => `${PREFIX}/courses/category/${encodeURIComponent(cat)}`,
    SUBCATEGORIES: (cat) => `${PREFIX}/courses/subcategories/${encodeURIComponent(cat)}`,
    TRENDING_TAGS: `${PREFIX}/courses/trending-tags`,
    RECOMMENDATIONS: (id) => `${PREFIX}/courses/${id}/recommendations`,
    RECOMMENDED: `${PREFIX}/courses/recommended`,
    TRACK_VIEW: (id) => `${PREFIX}/courses/lessons/${id}/view`,
    TRACK_WATCH: (id) => `${PREFIX}/courses/lessons/${id}/watch`,
    TRACK_DROPOFF: (id) => `${PREFIX}/courses/lessons/${id}/dropoff`,
    SUBMIT_REVIEW: (id) => `${PREFIX}/courses/${id}/submit-for-review`,
    APPROVE: (id) => `${PREFIX}/courses/${id}/approve`,
    REJECT: (id) => `${PREFIX}/courses/${id}/reject`,
    ADMIN_PENDING: `${PREFIX}/courses/admin/pending`,
    QUESTIONS: (courseId) => `${PREFIX}/courses/${courseId}/questions`,
    QUESTION_ANSWER: (courseId, questionId) => `${PREFIX}/courses/${courseId}/questions/${questionId}/answer`,
    QUESTION_DETAIL: (courseId, questionId) => `${PREFIX}/courses/${courseId}/questions/${questionId}`,
    ANSWER_DETAIL: (courseId, answerId) => `${PREFIX}/courses/${courseId}/answers/${answerId}`
  },
  TOKENS: {
    BALANCE: `${PREFIX}/tokens/balance`,
    CONSUME: `${PREFIX}/tokens/consume`,
    GRANT: `${PREFIX}/tokens/grant`
  },
  CERTIFICATES: {
    MINE: `${PREFIX}/certificates/mine`,
    VERIFY: (id) => `${PREFIX}/certificates/verify/${id}`,
    DETAIL: (id) => `${PREFIX}/certificates/${id}`
  },
  SEARCH: {
    GLOBAL: `${PREFIX}/search`
  },
  PAYMENTS: {
    CHECKOUT: (courseId) => `${PREFIX}/payments/checkout/${courseId}`
  },
  DIAGNOSE: {
    ANALYZE: `${PREFIX}/diagnose/analyze`,
    HISTORY: `${PREFIX}/diagnose/history`,
    DETAIL: (id) => `${PREFIX}/diagnose/${id}`,
    CREATE: `${PREFIX}/diagnose`
  },
  GROWLOG: {
    LIST: `${PREFIX}/growlog`,
    DETAIL: (id) => `${PREFIX}/growlog/${id}`,
    CREATE: `${PREFIX}/growlog`,
    AUTO_TAG: (id) => `${PREFIX}/growlog/${id}/auto-tag`
  },
  FEEDING: {
    LABEL: `${PREFIX}/feeding/label`,
    SCHEDULE: `${PREFIX}/feeding/schedule`,
    TO_TEMPLATE: `${PREFIX}/feeding/schedule/to-template`
  },
  ENVIRONMENT: {
    ANALYZE: `${PREFIX}/environment/analyze`,
    TO_TASKS: (id) => `${PREFIX}/environment/${id}/to-tasks`
  },
  REPORTS: {
    SUBMIT: `${PREFIX}/reports`,
    LIST: `${PREFIX}/reports`,
    RESOLVE: (id) => `${PREFIX}/reports/${id}/resolve`
  },
  GUILDS: {
    LIST: `${PREFIX}/guilds`,
    DETAIL: (id) => `${PREFIX}/guilds/${id}`,
    CREATE: `${PREFIX}/guilds`,
    JOIN: (id) => `${PREFIX}/guilds/${id}/join`,
    LEAVE: (id) => `${PREFIX}/guilds/${id}/leave`,
    DELETE: (id) => `${PREFIX}/guilds/${id}`
  },
  LIVES: {
    LIST: `${PREFIX}/lives`,
    DETAIL: (id) => `${PREFIX}/lives/${id}`,
    CREATE: `${PREFIX}/lives`,
    UPDATE: (id) => `${PREFIX}/lives/${id}`,
    DELETE: (id) => `${PREFIX}/lives/${id}`
  },
  SUBSCRIBE: {
    START: `${PREFIX}/subscribe/start`,
    CANCEL: `${PREFIX}/subscribe/cancel`,
    STATUS: `${PREFIX}/subscribe/status`,
    ME: `${PREFIX}/subscription/me`,
    CREATE_CHECKOUT_SESSION: `${PREFIX}/subscription/create-checkout-session`,
    VERIFY_IAP: `${PREFIX}/iap/verify`
  },
  CREATOR: {
    MINE: `${PREFIX}/earnings/mine`,
    BY_COURSE: `${PREFIX}/earnings/by-course`,
    REQUEST_PAYOUT: `${PREFIX}/earnings/request-payout`,
    PLATFORM_STATS: `${PREFIX}/earnings/platform`,
    PERFORMANCE: `${PREFIX}/creator/courses`,
    TIMELINE: `${PREFIX}/creator/enrollment-timeline`,
    PAYOUT_SUMMARY: `${PREFIX}/creator/payout-summary`,
    PAYOUT_HISTORY: `${PREFIX}/creator/payout-history`,
    SIGNATURE: `${PREFIX}/creator/signature`,
    ANALYTICS: (id) => `${PREFIX}/creator/course/${id}/analytics`,
    REVENUE: `${PREFIX}/creator/revenue-timeline`
  }
};

export default ROUTES;
