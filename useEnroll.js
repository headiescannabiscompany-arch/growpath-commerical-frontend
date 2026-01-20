// useEnroll.js
// Example React hook for enrolling in a course
import { useState } from "react";
import { enrollInCourse } from "./enrollmentApi";

export function useEnroll() {
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const enroll = async (courseId) => {
    setEnrolling(true);
    setError(null);
    try {
      const res = await enrollInCourse(courseId);
      setResult(res);
      return res;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setEnrolling(false);
    }
  };

  return { enroll, enrolling, error, result };
}

// Usage:
// const { enroll, enrolling, error, result } = useEnroll();
// enroll(courseId);
