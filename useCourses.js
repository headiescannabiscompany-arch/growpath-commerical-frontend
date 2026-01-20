// useCourses.js
// Example React hook for fetching courses
import { useState, useEffect } from "react";
import { getCourses } from "./courseApi";

export function useCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    getCourses()
      .then(setCourses)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { courses, loading, error };
}

// Example usage in a component:
// const { courses, loading, error } = useCourses();
// if (loading) return <Loading />;
// if (error) return <Error error={error} />;
// return <CourseList courses={courses} />;
