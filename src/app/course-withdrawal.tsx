import React from "react";
import Head from "expo-router/head";
import PublicInfoPage from "@/components/PublicInfoPage";
import CourseWithdrawalNoticeForm from "@/components/support/CourseWithdrawalNoticeForm";

export default function CourseWithdrawalPage() {
  return <>
    <Head><meta name="robots" content="noindex,nofollow,noarchive" /><meta name="referrer" content="no-referrer" /></Head>
    <PublicInfoPage title="Withdraw from a course contract" intro="Send a withdrawal notice for a course or course-gift contract made through GrowPathAI. Have your order or payment reference ready."
      sections={[]}>
      <CourseWithdrawalNoticeForm />
    </PublicInfoPage>
  </>;
}
