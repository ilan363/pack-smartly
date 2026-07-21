import type { TranslationKey } from "@/lib/i18n/translations";

export type ContactFaqItem = {
  id: string;
  questionKey: TranslationKey;
  answerKey: TranslationKey;
};

export const CONTACT_FAQ_ITEMS: ContactFaqItem[] = [
  { id: "whatIs", questionKey: "contact.faq.whatIs.q", answerKey: "contact.faq.whatIs.a" },
  { id: "howItWorks", questionKey: "contact.faq.howItWorks.q", answerKey: "contact.faq.howItWorks.a" },
  { id: "destination", questionKey: "contact.faq.destination.q", answerKey: "contact.faq.destination.a" },
  { id: "clothingQty", questionKey: "contact.faq.clothingQty.q", answerKey: "contact.faq.clothingQty.a" },
  { id: "weight", questionKey: "contact.faq.weight.q", answerKey: "contact.faq.weight.a" },
  { id: "editList", questionKey: "contact.faq.editList.q", answerKey: "contact.faq.editList.a" },
  { id: "tripTypes", questionKey: "contact.faq.tripTypes.q", answerKey: "contact.faq.tripTypes.a" },
  { id: "experience", questionKey: "contact.faq.experience.q", answerKey: "contact.faq.experience.a" },
  { id: "aiControl", questionKey: "contact.faq.aiControl.q", answerKey: "contact.faq.aiControl.a" },
  { id: "advantages", questionKey: "contact.faq.advantages.q", answerKey: "contact.faq.advantages.a" },
  { id: "mobile", questionKey: "contact.faq.mobile.q", answerKey: "contact.faq.mobile.a" },
  { id: "whyChoose", questionKey: "contact.faq.whyChoose.q", answerKey: "contact.faq.whyChoose.a" },
];
