import type { FlowOutput, FlowState } from "@/types/flow";
import { askAgain, matchOption } from "./helpers";

// Parcours technique (Ressources Chatbot.docx.pdf — Guide technique, §1):
// qualify the situation (type of content, platform, nature) then orient to
// the validated reporting channels (answers from QA 3.2/3.3/3.4/4.5).
const CONTENT_OPTIONS = [
  "Une photo ou une vidéo",
  "Un message ou des commentaires",
  "Un compte, une page ou un groupe",
  "Un autre type de situation",
];

const PLATFORM_OPTIONS = [
  "Instagram",
  "Facebook",
  "TikTok",
  "Snapchat",
  "X (Twitter)",
  "WhatsApp ou une autre messagerie",
  "Un site web ou autre",
];

const NATURE_OPTIONS = [
  "Contenu intime me concernant (adulte)",
  "Contenu intime pris avant mes 18 ans",
  "Photos ou vidéos d'abus sur un enfant",
  "Ni l'un ni l'autre (insultes, moqueries, montage...)",
];

const ORIENT_OPTIONS = ["Porter plainte en ligne", "Soutien psychologique", "Terminer"];

function orientationText(
  contentType: string,
  nature: string | undefined,
  platform: string,
): string {
  const intime = nature === "Contenu intime me concernant (adulte)";
  const ancienMineur = nature === "Contenu intime pris avant mes 18 ans";
  const abusEnfant = nature === "Photos ou vidéos d'abus sur un enfant";

  if (intime || ancienMineur) {
    const plateforme =
      ancienMineur && !intime
        ? "Take It Down (https://takeitdown.ncmec.org/fr/) permet aux mineurs ou anciens mineurs de demander la suppression de contenus intimes pris avant l'âge de 18 ans."
        : "StopNCII (https://stopncii.org/?lang=fr-fr) s'adresse aux adultes menacés de diffusion de leurs images intimes.";
    return `Surtout, ne cédez pas au chantage et ne partagez pas le contenu. ${plateforme} Dans tous les cas, signalez le contenu sur https://evigilance.ma/fr ou https://www.cyberconfiance.ma/signalment/ : l'équipe intervient pour la suppression du contenu et propose une orientation juridique et un soutien psychologique.`;
  }
  if (abusEnfant) {
    return `Ce type de contenu doit être signalé via la plateforme partenaire de l'Internet Watch Foundation (IWF) : https://report.iwf.org.uk/ma/. Il s'agit d'un canal spécialisé distinct du signalement de cyberharcèlement classique. Vous pouvez aussi contacter le numéro vert 2511 (ONDE) : https://2511.ma/.`;
  }
  if (contentType === "Un message ou des commentaires") {
    return `Deux réflexes : bloquez le compte de l'agresseur, et signalez le contenu sur https://evigilance.ma/fr ou https://www.cyberconfiance.ma/signalment/. Faites des captures d'écran avant de bloquer : les preuves sont votre arme, et ne restez jamais seul(e) — parlez-en à une personne de confiance.`;
  }
  if (contentType === "Un compte, une page ou un groupe") {
    return `Signalez le compte, la page ou le groupe directement au réseau social : sur ${platform}, chaque publication permet de signaler un contenu ou un profil. Signalez-le aussi sur https://evigilance.ma/fr ou https://www.cyberconfiance.ma/signalment/ : l'équipe intervient pour la suppression du contenu et propose une orientation juridique et un soutien psychologique.`;
  }
  return `Signalez le contenu sur https://evigilance.ma/fr ou https://www.cyberconfiance.ma/signalment/ : l'équipe intervient pour la suppression du contenu et propose une orientation juridique et un soutien psychologique. Faites des captures d'écran et enregistrez les liens des contenus en cause : les preuves sont votre arme.`;
}

export function technicalFlow(state: FlowState, rawMessage: string): FlowOutput {
  switch (state.step) {
    case "start":
      return {
        text: "Parcours technique. Je vais vous aider à qualifier votre situation avant de vous orienter vers le bon formulaire. S'agit-il d'une photo, d'une vidéo, d'un message ou d'un compte ?",
        options: CONTENT_OPTIONS,
        nextStep: "content-type",
      };
    case "content-type": {
      const index = matchOption(rawMessage, CONTENT_OPTIONS);
      if (index < 0) return askAgain(state);
      const contentType = CONTENT_OPTIONS[index];
      if (contentType === "Une photo ou une vidéo") {
        return {
          text: `Merci. Sur quel réseau social ou support le contenu a-t-il été publié ?`,
          options: PLATFORM_OPTIONS,
          nextStep: "platform",
          data: { contentType },
        };
      }
      return {
        text: `Merci. Sur quel réseau social ou support le contenu a-t-il été publié ?`,
        options: PLATFORM_OPTIONS,
        nextStep: "platform",
        data: { contentType },
      };
    }
    case "platform": {
      const index = matchOption(rawMessage, PLATFORM_OPTIONS);
      if (index < 0) return askAgain(state);
      const platform = PLATFORM_OPTIONS[index];
      if (state.data.contentType === "Une photo ou une vidéo") {
        return {
          text: `Merci. Une dernière question : quelle est la nature du contenu ?`,
          options: NATURE_OPTIONS,
          nextStep: "nature",
          data: { platform },
        };
      }
      return {
        text: orientationText(state.data.contentType ?? "", undefined, platform),
        options: ORIENT_OPTIONS,
        nextStep: "end",
        data: { platform },
      };
    }
    case "nature": {
      const index = matchOption(rawMessage, NATURE_OPTIONS);
      if (index < 0) return askAgain(state);
      return {
        text: orientationText(
          state.data.contentType ?? "",
          NATURE_OPTIONS[index],
          state.data.platform ?? "",
        ),
        options: ORIENT_OPTIONS,
        nextStep: "end",
        data: { nature: NATURE_OPTIONS[index] },
      };
    }
    case "end": {
      const index = matchOption(rawMessage, ORIENT_OPTIONS);
      if (index === 0) return { text: "", switchTo: "parcours-juridique" };
      if (index === 1) return { text: "", switchTo: "parcours-psychologique" };
      return { text: "D'accord. N'oubliez pas : l'EMC-Helpline est disponible 24h/24 et 7j/7 si vous avez besoin d'aide. Vous pouvez aussi demander le parcours psychologique à tout moment." };
    }
    default:
      return { text: "D'accord. N'oubliez pas : l'EMC-Helpline est disponible 24h/24 et 7j/7 si vous avez besoin d'aide." };
  }
}