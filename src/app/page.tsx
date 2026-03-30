import { NewHero } from "@/components/landing/new-hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";

export default function HomePage() {
  return (
    <>
      <NewHero />
      <Features />
      <HowItWorks />
    </>
  );
}