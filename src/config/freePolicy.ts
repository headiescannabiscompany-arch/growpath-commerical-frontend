export const FREE_POLICY = Object.freeze({
  aiCreditsPerWeek: 5,
  maxTrackedGrows: 1,
  maxTrackedPlants: 1,
  maxPublishedPaidCourses: 1,
  maxLessonsPerCourse: 7,
  forumPostsPerDay: 0,
  forumCommentsPerDay: 0,
  uploadStorageBytes: 500 * 1024 * 1024,
  paidAdReductionPercentMinimum: 50,
  aiActions: Object.freeze({
    assistant: Object.freeze({ credits: 1, estimatedUsd: 0.002 }),
    diagnosis: Object.freeze({ credits: 3, estimatedUsd: 0.02 })
  })
});
