import AuthSection from "@/components/auth/auth-section";
import LegalSection from "@/components/auth/legal-section";
import { ActivityPanel } from "@/components/features/activity-panel";
import { AdvertPopup } from "@/components/features/advert-slot";

const ModalProvider = () => {

  return (
    <>
      <AuthSection/>
      <ActivityPanel/>
      <LegalSection/>
      <AdvertPopup/>
    </>
  )
}

export default ModalProvider;