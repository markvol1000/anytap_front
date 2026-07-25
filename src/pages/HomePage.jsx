import { Hero, TrustBar, CardFeatures, MobilePay } from '../components/sections.jsx';
import { Features, HowItWorks } from '../components/home-anim.jsx';
import { HomeFaq } from '../components/HomeFaq.tsx';

export function HomePage() {
  return (
    <>
      <Hero />
      <TrustBar />
      <Features />
      <CardFeatures />
      <HowItWorks />
      <MobilePay />
      <HomeFaq />
    </>
  );
}
