import React from "react";
import OnboardingPage from "@/features/employees/onboarding/comp";

const Onboarding = () => {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 p-4 md:gap-6 md:py-6">
        <OnboardingPage />
      </div>
    </div>
  );
};

export default Onboarding;
