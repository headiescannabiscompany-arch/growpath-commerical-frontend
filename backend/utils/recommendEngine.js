const Course = require("../models/Course");
const User = require("../models/User");

async function recommendCourses(userId) {
  const user = await User.findById(userId);
  if (!user) return [];

  const prefs = user.preferences || {};

  const WEIGHTS = {
    categoryMatch: 4,
    tagMatch: 3,
    similarStudentActivity: 2,
    trending: 1,
  };

  const allCourses = await Course.find({ isPublished: true });

  const scored = allCourses.map((course) => {
    let score = 0;

    if (prefs.viewedCategories && prefs.viewedCategories.includes(course.category)) {
      score += WEIGHTS.categoryMatch;
    }

    if (Array.isArray(prefs.preferredTags) && Array.isArray(course.tags)) {
      const tagMatches = course.tags.filter((t) => prefs.preferredTags.includes(t)).length;
      score += tagMatches * WEIGHTS.tagMatch;
    }

    // popularity proxy
    if (Array.isArray(course.students) && course.students.length > 30) {
      score += WEIGHTS.similarStudentActivity;
    }

    if ((course.rating || 0) > 4.5 && (course.ratingCount || 0) > 10) {
      score += WEIGHTS.trending;
    }

    return { course, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 20).map((s) => s.course);
}

module.exports = recommendCourses;
