import AuthSection from "@/components/auth/auth-section";
import LegalSection from "@/components/auth/legal-section";
import { ActivityPanel } from "@/components/features/activity-panel";

const ModalProvider = () => {
  
  return (
    <>
      <AuthSection/>
      <ActivityPanel/>
      <LegalSection/>
    </>
  )
}

export default ModalProvider;