# Q&A Knowledge Base — source of truth

Canonical, encadrante-validated content for the EMC Helpline chatbot, extracted
from `Bases_questions_réponses-Version2.pdf` (Aboulhaj Yassine, July 28, 2026).
25 scenarios total. The crisis protocol (suicidal ideation / immediate danger)
is **not** duplicated here — it lives in `AGENTS.md` §6 and must be checked
before any of the entries below.

## A note on `parcours` tagging

The source PDF's annex maps five "parcours" (routing themes) to section
ranges, but those ranges use an older section-numbering scheme from before
Version 2 inserted a new section 2 ("Présentation de l'EMC"), so the numbers
in the annex (e.g. "Parcours Technique (2.1 à 2.6)") no longer line up with
the current section numbers below. Where the annex's own keyword lists make
the mapping unambiguous by content, I've applied it. Where they don't (2.1,
2.2, and 7.1–7.3 — general/onboarding content not covered by any of the five
listed keyword sets), I've left `parcours` unassigned rather than guess.
Worth a quick confirmation from Mme Belaous if the `parcours` field ends up
mattering for routing UX.

---

### 2.1 — Qu'est-ce que l'Espace Maroc Cyberconfiance (EMC) ?

**Profils concernés:** Tous profils (question d'entrée générique)
**Parcours:** non classé dans l'annexe

**Formulations exemples:**
- « C'est quoi l'EMC ? »
- « Vous êtes qui ? C'est un service officiel ? »
- « Je suis tombé sur ce chatbot, il fait quoi exactement ? »
- « En tant qu'enseignant, je découvre ce service, à qui s'adresse-t-il ? »

**Réponse:**
L'Espace Maroc Cyberconfiance (EMC) est une initiative du Centre Marocain de
Recherches Polytechniques et d'Innovation (CMRPI). C'est un espace
communautaire d'experts bénévoles, à but non lucratif, au service des
internautes au Maroc, en particulier des enfants et des jeunes — la catégorie
la plus vulnérable aux risques du numérique. L'EMC accompagne les internautes
dans le monde virtuel et instaure chez eux la culture de la cybersécurité et
les valeurs de la citoyenneté numérique.

**Mots-clés déclencheurs:** EMC, Espace Maroc Cyberconfiance, CMRPI, qui êtes-vous, c'est quoi l'EMC, présentation, qui sommes-nous, service officiel

---

### 2.2 — Quels sont les objectifs de l'EMC ?

**Profils concernés:** Tous profils, en particulier parents et enseignants découvrant le service
**Parcours:** non classé dans l'annexe

**Formulations exemples:**
- « À quoi sert vraiment ce service ? »
- « Vous faites autre chose que juste répondre aux questions ? »
- « En tant que parent, qu'est-ce que l'EMC peut faire pour ma famille ? »

**Réponse:**
L'EMC poursuit cinq objectifs : Sensibiliser les internautes aux risques et à
la citoyenneté numérique ; Former internautes et formateurs aux bonnes
pratiques de cybersécurité ; Aider les internautes en difficulté technique ou
juridique et orienter les victimes vers les autorités compétentes ; Éduquer
les enfants et les jeunes à un usage responsable d'Internet ; Analyser les
comportements en ligne pour formuler des recommandations et alerter les
autorités.

**Mots-clés déclencheurs:** objectifs EMC, mission, rôle, sensibiliser, former, aider, éduquer, analyser, à quoi sert l'EMC

---

### 3.1 — Qu'est-ce que l'EMC-Helpline et comment y accéder ?

**Profils concernés:** Victime (mineure ou majeure), parent souhaitant agir pour son enfant
**Parcours:** Technique

**Formulations exemples:**
- « J'ai besoin d'aide, il y a quelqu'un pour m'écouter ? »
- « Est-ce que c'est gratuit ? Je peux appeler la nuit ? »
- « Mon enfant se fait harceler, il y a un numéro pour ça ? »

**Réponse:**
L'EMC-Helpline est une ligne nationale d'assistance en ligne, gratuite et
accessible 24h/24 et 7j/7, dédiée aux victimes de cyberviolences et de
cyberharcèlement. Elle permet de signaler un contenu via un formulaire en
ligne, d'obtenir la suppression de contenus illicites ou inappropriés sur les
réseaux sociaux, ainsi qu'une orientation juridique et un soutien
psychologique.

**Mots-clés déclencheurs:** EMC-Helpline, ligne d'assistance, aide gratuite, 24h/24, 7j/7, assistance victime, besoin d'aide

---

### 3.2 — Comment signaler un contenu de cyberviolence publié sur les réseaux sociaux ?

**Profils concernés:** Victime, témoin, parent agissant au nom de son enfant
**Parcours:** Technique

**Formulations exemples:**
- « Comment je fais pour signaler une photo humiliante postée sur les réseaux sociaux ? »
- « Mon amie a reçu des messages horribles, comment on signale ça ? »
- « Je veux faire supprimer un contenu qui me concerne, c'est possible ? »

**Réponse:**
Vous pouvez signaler tout contenu de cyberviolence ou de cyberharcèlement via
le formulaire en ligne https://evigilance.ma/fr/signaler, ou solliciter
l'EMC-Helpline via https://www.cyberconfiance.ma/signalment/. L'équipe
intervient pour la suppression du contenu et propose orientation juridique et
soutien psychologique. Si vous êtes témoin : vous pouvez signaler en
accompagnant la victime dans la démarche, sans partager ni republier le
contenu en question.

**Mots-clés déclencheurs:** signaler, evigilance, formulaire signalement, contenu illicite, réseaux sociaux, comment signaler

---

### 3.3 — Comment signaler des images ou vidéos d'abus sexuel sur des enfants ?

**Profils concernés:** Parent, enseignant, témoin, professionnel
**Parcours:** Technique

**Formulations exemples:**
- « J'ai vu quelque chose d'horrible impliquant un enfant, comment je signale ? »
- « Existe-t-il un canal spécifique pour ce genre de contenu ? »

**Réponse:**
Ce type de contenu doit être signalé via la plateforme partenaire de
l'Internet Watch Foundation (IWF) : https://report.iwf.org.uk/ma/. Il s'agit
d'un canal spécialisé distinct du signalement de cyberharcèlement classique.

**Mots-clés déclencheurs:** abus sexuel enfant, contenu illégal, pédocriminalité en ligne, IWF, signaler image enfant, matériel d'exploitation

---

### 3.4 — Comment demander la suppression de contenus intimes diffusés sans consentement ?

**Profils concernés:** Victime mineure ou majeure (y compris ancien(ne) mineur(e)), parent
**Parcours:** Technique

**Formulations exemples:**
- « On menace de diffuser mes photos intimes, je fais quoi ? »
- « J'étais mineure quand la photo a été prise, est-ce que je peux encore agir aujourd'hui ? »
- « Ma fille est majeure mais on la fait chanter avec des images, vers qui l'orienter ? »

**Réponse:**
Deux plateformes existent selon l'âge de la victime au moment de la prise du
contenu : StopNCII (https://stopncii.org/?lang=fr-fr) s'adresse aux adultes
menacés de diffusion de leurs images intimes (revenge porn) ; Take It Down
(https://takeitdown.ncmec.org/fr/) permet aux mineurs ou anciens mineurs de
demander la suppression de contenus intimes pris avant l'âge de 18 ans. Dans
tous les cas, il est aussi recommandé de signaler le contenu sur
https://evigilance.ma/fr.

**Mots-clés déclencheurs:** revenge porn, contenu intime, StopNCII, Take It Down, suppression photo, sextorsion, diffusion image intime, chantage photo

---

### 3.5 — Que faire si un enfant est en danger en ligne ?

**Profils concernés:** Parent, enseignant, témoin
**Parcours:** Technique

**Formulations exemples:**
- « Mon enfant discute avec un inconnu qui me semble louche, j'appelle qui ? »
- « Un élève m'a confié qu'il était en danger sur Internet, que dois-je faire ? »

**Réponse:**
Deux options complémentaires : contacter le numéro vert de l'Observatoire
National des Droits de l'Enfant (ONDE), le 2511 (https://2511.ma/), ou
solliciter la ligne d'assistance EMC-Helpline via
https://www.cyberconfiance.ma/signalment/. L'assistance est disponible 24h/24
et 7j/7.

**Mots-clés déclencheurs:** enfant en danger, ONDE, 2511, urgence enfant, protection enfant, aide immédiate enfant

---

### 3.6 — Je suis enseignant(e) : comment réagir face à un cas de cyberharcèlement scolaire ?

**Profils concernés:** Enseignant, éducateur, direction d'établissement
**Parcours:** Technique

**Formulations exemples:**
- « Un élève de ma classe est harcelé en ligne par d'autres élèves, comment je gère ça ? »
- « Existe-t-il un protocole officiel pour les établissements scolaires ? »
- « Je ne veux pas aggraver la situation en intervenant seul(e), que faire ? »

**Réponse:**
Ne confrontez jamais seul(e) les élèves impliqués : documentez la situation
(captures d'écran, dates), informez la direction de l'établissement et, si
disponible, le référent formé au traitement du cyberharcèlement scolaire.
Orientez la famille de l'élève victime vers l'EMC-Helpline
(https://www.cyberconfiance.ma/signalment/) ou vers le numéro vert 2511 si un
accompagnement est nécessaire. Le CMRPI, en partenariat avec le ministère de
l'Éducation nationale, a mis en place un protocole de prise en charge dans les
établissements scolaires ainsi que des sessions de formation dédiées aux
enseignants ; renseignez-vous auprès de votre établissement sur la
qualification de vos référents.

**Mots-clés déclencheurs:** enseignant, milieu scolaire, élève harcelé, protocole scolaire, direction établissement, référent cyberharcèlement, que faire en classe

---

### 4.1 — Le cyberharcèlement est-il puni par la loi au Maroc ?

**Profils concernés:** Victime, parent, professionnel
**Parcours:** Juridique

**Formulations exemples:**
- « Est-ce que c'est vraiment illégal ce qu'on me fait subir ? »
- « Je veux savoir si la loi marocaine protège vraiment les victimes »

**Réponse:**
Oui. Toutes les formes de cyberviolence et de cyberharcèlement sont interdites
par la loi marocaine. Plusieurs textes protègent les victimes, notamment
l'article 503-2 du Code pénal, la loi 27-14 (traite des êtres humains), la loi
88-13 (presse et édition), la loi 103-13 (atteinte à la vie privée et
harcèlement sexuel) et la loi 09-08 (protection des données personnelles).

**Mots-clés déclencheurs:** loi, punition, sanction légale, cyberharcèlement illégal, droit marocain, législation cybersécurité

---

### 4.2 — Que dit la loi sur l'exploitation sexuelle des enfants en ligne ?

**Profils concernés:** Parent, enseignant, professionnel
**Parcours:** Juridique

**Formulations exemples:**
- « Qu'est-ce que la loi prévoit contre la pédocriminalité en ligne ? »

**Réponse:**
L'article 503-2 du Code pénal marocain criminalise toute action visant à
provoquer, inciter ou faciliter l'exploitation d'enfants dans des contenus à
caractère pornographique, y compris par des moyens électroniques. La loi
n°27-14 relative à la lutte contre la traite des êtres humains assimile toute
exploitation d'un mineur de moins de 18 ans — notamment via la pornographie et
les moyens numériques — à un acte de traite d'êtres humains.

**Mots-clés déclencheurs:** exploitation sexuelle enfant, article 503-2, loi 27-14, traite des êtres humains, protection légale enfant

---

### 4.3 — Que dit la loi sur l'atteinte à la vie privée et le cyberharcèlement sexuel ?

**Profils concernés:** Victime, professionnel
**Parcours:** Juridique

**Formulations exemples:**
- « On a monté une fausse photo de moi et diffusé, c'est puni par la loi ? »
- « Je reçois des messages à caractère sexuel non désirés en boucle, c'est un délit ? »

**Réponse:**
La loi 103-13 punit la diffusion ou la distribution, par des moyens
informatiques, d'un montage ou d'une photographie d'une personne sans son
consentement, ainsi que la diffusion de fausses allégations portant atteinte
à la vie privée ou visant à diffamer, y compris à l'encontre des enfants.
Elle sanctionne également le cyberharcèlement sexuel, c'est-à-dire l'envoi
répété de messages, appels, vidéos ou images à caractère sexuel non
sollicités.

**Mots-clés déclencheurs:** vie privée, diffamation en ligne, cyberharcèlement sexuel, loi 103-13, injure, montage photo

---

### 4.4 — Quelles garanties spécifiques existent pour les femmes victimes de cyberviolence ?

**Profils concernés:** Victime majeure (femmes), professionnel juridique
**Parcours:** Juridique

**Formulations exemples:**
- « En tant que femme, ai-je des protections particulières ? »
- « Je suis une femme migrante, est-ce que j'ai les mêmes droits ? »
- « Peut-on demander à être entendue sans que ce soit public ? »

**Réponse:**
La loi 103-13 a créé des cellules spécialisées de prise en charge des femmes
victimes de violence au sein des tribunaux et des services de police, de
santé, de justice et de gendarmerie, assurant accueil, écoute et
accompagnement. La victime peut demander une audience à huis clos, ou un
transfert vers un établissement de santé pour recevoir des soins. Toutes les
victimes, y compris les femmes migrantes, bénéficient des mêmes droits, quel
que soit leur statut juridique : la victime n'est jamais responsable de ce
qu'elle subit. Le Maroc s'appuie également sur un cadre international (CEDAW,
Convention 108 du Conseil de l'Europe, Convention de Budapest sur la
cybercriminalité) en complément de ce dispositif national.

**Mots-clés déclencheurs:** femme victime, cellule de prise en charge, huis clos, femme migrante, loi 103-13, garanties procédurales, droits des femmes en ligne

---

### 4.5 — Comment collecter des preuves et où porter plainte ?

**Profils concernés:** Victime, parent, témoin, professionnel
**Parcours:** Juridique

**Formulations exemples:**
- « Je dois faire quoi comme preuves avant de porter plainte ? »
- « Il faut aller où exactement pour déposer une plainte ? »

**Réponse:**
Il est recommandé de faire des captures d'écran, d'enregistrer les liens des
contenus ou messages en cause, et de sauvegarder tout élément pertinent, sans
porter atteinte à la vie privée de l'enfant. Pour porter plainte : le parquet
(sur place ou via https://plaintes.pmp.ma/), les services de Police via la
plateforme E-Blagh (https://www.e-blagh.ma/), la Gendarmerie Royale (en
milieu rural), le centre d'aide du Ministère de la Justice
(+212537266600), ou les cellules de prise en charge des femmes et enfants
victimes de violence dans les tribunaux.

**Mots-clés déclencheurs:** porter plainte, preuves, capture d'écran, e-blagh, plaintes.pmp.ma, gendarmerie, police, parquet, où signaler

---

### 5.1 — Quelles conséquences le cyberharcèlement peut-il avoir sur la santé mentale ?

**Profils concernés:** Victime, parent, enseignant
**Parcours:** Psychologique

**Formulations exemples:**
- « Depuis que je suis harcelé(e) en ligne, je ne dors plus, c'est normal ? »
- « Est-ce que ça peut vraiment affecter la santé mentale sur le long terme ? »

**Réponse:**
Les victimes peuvent ressentir du stress, de l'anxiété, une dépression, de la
honte, une perte d'estime de soi, un isolement social, des problèmes
physiques (insomnie, troubles gastro-intestinaux) et, dans les cas les plus
graves, des idées suicidaires. Ces effets peuvent perdurer même après l'arrêt
du harcèlement.

> Note du document source : si la personne exprime des idées suicidaires,
> appliquer immédiatement le Cas 1 du protocole de sécurité prioritaire (voir
> `AGENTS.md` §6) — cette entrée ne remplace jamais ce protocole.

**Mots-clés déclencheurs:** santé mentale, conséquences psychologiques, stress, anxiété, dépression, honte, isolement, effets du harcèlement

---

### 5.2 — Quels sont les signaux d'alerte à surveiller chez un enfant potentiellement victime ?

**Profils concernés:** Parent, enseignant, éducateur
**Parcours:** Psychologique

**Formulations exemples:**
- « Mon enfant a beaucoup changé ces derniers temps, à quoi dois-je faire attention ? »
- « Comment savoir si un de mes élèves est victime de harcèlement en ligne ? »

**Réponse:**
Les parents et enseignants peuvent être attentifs à : des changements de
comportement (anxiété, tristesse, repli sur soi) ; des symptômes physiques
(troubles du sommeil, maux de ventre) ; une baisse des résultats scolaires ;
une modification brutale des habitudes numériques (arrêt ou surveillance
obsessionnelle des réseaux) ; un changement d'apparence soudain. La
communication bienveillante avec l'enfant reste la clé pour établir une
relation de confiance.

**Mots-clés déclencheurs:** signaux d'alerte, signes, comportement enfant, symptômes, parent inquiet, mon enfant a changé, élève changé

---

### 5.3 — Qu'est-ce que le bien-être numérique ?

**Profils concernés:** Tous profils
**Parcours:** Psychologique

**Formulations exemples:**
- « C'est quoi le bien-être numérique, on en entend beaucoup parler ? »

**Réponse:**
Le bien-être numérique est l'expérience subjective et individuelle d'un
équilibre optimal entre les avantages et les inconvénients associés à la
connectivité mobile.

**Mots-clés déclencheurs:** bien-être numérique, équilibre numérique, santé numérique, définition bien-être

---

### 6.1 — Qu'est-ce que la cyberviolence et le cyberharcèlement ? Quelle différence ?

**Profils concernés:** Tous profils
**Parcours:** Informatif

**Formulations exemples:**
- « C'est quoi la différence entre cyberviolence et cyberharcèlement ? »
- « On me dit que ce n'est "que" une insulte en ligne, est-ce que c'est grave ? »

**Réponse:**
La cyberviolence regroupe toutes les formes de violence réalisées avec des
écrans, diffusées sur Internet ou via les réseaux sociaux (insultes, photos
embarrassantes, etc.). Lorsqu'une cyberviolence est répétée dans le temps à
l'encontre d'un enfant, ou qu'elle se propage sur les réseaux sociaux, on
parle de cyberharcèlement. Le cyberharcèlement est interdit par la loi, même
s'il se déroule en ligne.

**Mots-clés déclencheurs:** définition cyberviolence, définition cyberharcèlement, différence, c'est quoi le cyberharcèlement

---

### 6.2 — Quelles sont les différentes facettes du cyberharcèlement ?

**Profils concernés:** Tous profils
**Parcours:** Informatif

**Formulations exemples:**
- « J'ai entendu parler de "doxing", c'est quoi exactement ? »
- « Qu'est-ce que le grooming, on m'a dit que mon enfant pourrait y être exposé ? »

**Réponse:**
Le cyberharcèlement peut prendre de nombreuses formes : le stalking
(harcèlement obsessionnel), les cybermenaces, le dénigrement (rumeurs, photos
portant atteinte à la réputation), le doxing (publication d'informations
personnelles sans accord), l'exclusion de groupes, le flaming (messages
hostiles), le fraping (fausses publications sous l'identité d'autrui), le
grooming (approche d'un enfant sous fausse identité), l'usurpation d'identité,
l'outing (divulgation d'informations privées), le revenge porn et la
sextorsion (chantage avec des contenus intimes).

**Mots-clés déclencheurs:** stalking, doxing, grooming, sextorsion, revenge porn, dénigrement, usurpation d'identité, fraping, flaming, outing, facettes de cyberharcèlement, formes de harcèlement

---

### 6.3 — Quels types de cyberviolence mon enfant pourrait-il rencontrer ?

**Profils concernés:** Parent, enseignant
**Parcours:** Informatif

**Formulations exemples:**
- « À quoi mon enfant est-il exposé concrètement sur Internet ? »

**Réponse:**
Un enfant peut être exposé à : des contenus inappropriés ; des messages
injurieux ou des moqueries ; de l'exploitation ou de l'extorsion sexuelle en
ligne ; de l'incitation à la haine ou à la radicalisation ; l'utilisation
frauduleuse de ses données personnelles ; la diffusion de rumeurs ; le
piratage de compte ou l'usurpation d'identité ; la publication de contenus
humiliants ; des échanges de contenus à caractère sexuel (sexting) ; ou du
chantage à la webcam.

**Mots-clés déclencheurs:** risques enfant, contenu inapproprié, extorsion sexuelle, radicalisation, sexting, chantage webcam, dangers internet enfant

---

### 6.4 — Quelles sont les grandes facettes de la cyberviolence selon les standards internationaux ?

**Profils concernés:** Professionnel, enseignant, parent souhaitant une vue d'ensemble
**Parcours:** Informatif

**Formulations exemples:**
- « Est-ce qu'il existe une classification plus large que le harcèlement scolaire ? »

**Réponse:**
L'agenda Safer Internet Day 2020 (« Ayez votre mot à dire »), auquel le CMRPI
a participé comme partenaire national, regroupe la cyberviolence en seize
grandes facettes : protection des données personnelles,
harcèlement/cyberintimidation, sexting et harcèlement sexuel, pornographie
juvénile, fausses informations, réseaux sociaux et dépendance,
cybersécurité/cybercriminalité, obtenir de l'aide et signalement, incitation
à nuire, extorsion de fonds et marketing peu scrupuleux, discours de haine,
bien-être physique et mental en ligne, sécurité en ligne, liberté
d'expression, jeux et jeux de hasard, ainsi qu'usurpation d'identité et faux
profils. Cette classification aide à situer une situation vécue dans un cadre
plus large que le seul harcèlement entre élèves.

**Mots-clés déclencheurs:** facettes cyberviolence, Safer Internet Day, classification, seize thématiques, typologie internationale

---

### 7.1 — Quelles sont les bonnes pratiques de cybersécurité pour se protéger ?

**Profils concernés:** Tous profils
**Parcours:** non classé dans l'annexe

**Formulations exemples:**
- « Comment je peux mieux me protéger sur Internet au quotidien ? »

**Réponse:**
Quelques règles essentielles : utiliser des mots de passe robustes
(minuscules, majuscules, chiffres, signes) et les changer régulièrement ; ne
jamais partager d'informations personnelles, même sur un formulaire ;
sécuriser les objets connectés avec un mot de passe ; désactiver la
géolocalisation et bien réfléchir avant de publier sur les réseaux sociaux ;
se fixer des temps de jeu raisonnables et ne donner aucune information
personnelle à d'autres joueurs en ligne ; toujours respecter autrui en ligne
comme en face à face.

**Mots-clés déclencheurs:** bonnes pratiques, mot de passe, sécurité en ligne, protection des données, conseils, comment me protéger

---

### 7.2 — Que faire si je suis victime de cyberharcèlement ?

**Profils concernés:** Victime
**Parcours:** non classé dans l'annexe

**Formulations exemples:**
- « Je suis harcelé(e), je fais quoi maintenant ? »
- « Je ne sais pas par où commencer, aidez-moi »

**Réponse:**
Quatre réflexes : Protéger — paramétrer ses comptes en privé et réfléchir
avant de publier ; Collecter — faire des captures d'écran, les preuves sont
votre arme ; Bloquer et signaler — signaler le contenu et bloquer le compte
de l'agresseur ; Parler — ne jamais rester seul(e), en parler à une personne
de confiance ou à l'EMC-Helpline.

**Mots-clés déclencheurs:** je suis victime, que faire, bloquer, signaler, parler à quelqu'un, harcelé en ligne

---

### 7.3 — Que faire en tant que parent, enseignant ou témoin de cyberviolence ?

**Profils concernés:** Parent, enseignant, témoin
**Parcours:** non classé dans l'annexe

**Formulations exemples:**
- « Mon enfant m'a montré des messages inquiétants, comment réagir sans le braquer ? »
- « Un de mes camarades se fait harceler, je fais quoi si je ne veux pas m'en mêler publiquement ? »

**Réponse:**
En tant que parent : dialoguer sans jugement et assurer un soutien
inconditionnel, éduquer aux valeurs de citoyenneté numérique (empathie,
respect de la vie privée), et utiliser les outils de contrôle parental comme
alliés. En tant qu'enseignant : documenter la situation, ne pas confronter
seul(e) les élèves impliqués, et orienter la famille vers les ressources
adaptées. En tant que témoin : ne jamais amplifier (ne pas liker ni partager
un contenu humiliant), soutenir la victime par un message privé bienveillant,
et signaler le contenu sur l'EMC-Helpline.

**Mots-clés déclencheurs:** parent, enseignant, témoin, que faire, soutenir victime, dialoguer, contrôle parental, mon ami est harcelé

---

### 7.4 — Comment adapter la protection de mon enfant selon son âge ?

**Profils concernés:** Parent, tuteur
**Parcours:** Parental

**Formulations exemples:**
- « Mon enfant a 5 ans, à quoi dois-je faire attention à cet âge ? »
- « À partir de quel âge puis-je lui laisser un smartphone à lui ? »

**Réponse:**
Le guide familial de protection des enfants en ligne (Ministère de la
Solidarité, du Développement Social, de l'Égalité et de la Famille, avec
l'UNICEF) propose des repères par tranche d'âge : avant 3 ans, éviter les
écrans pour calmer l'enfant et privilégier le jeu partagé ; 3 à 6 ans, fixer
des règles claires de durée et garder les écrans dans les pièces communes ; 6
à 9 ans, équilibrer usage scolaire et loisir, dialoguer sur le droit à
l'image et à la vie privée ; 9 à 12 ans, autoriser un accès encadré et
surveillé, définir ensemble l'âge d'un premier smartphone ; 12 à 18 ans,
accompagner vers plus d'autonomie tout en abordant clairement les risques
(cybercriminalité, discours de haine, radicalisation, vol de données) et en
coupant les appareils avant le coucher.

**Mots-clés déclencheurs:** âge enfant, tranche d'âge, premier smartphone, guide familial, protection selon l'âge, règles familiales

---

### 7.5 — Quelles applications de contrôle parental et quels moteurs de recherche recommander ?

**Profils concernés:** Parent, tuteur
**Parcours:** Parental

**Formulations exemples:**
- « Existe-t-il des applications pour surveiller ce que fait mon enfant en ligne ? »
- « Y a-t-il un moteur de recherche plus sûr pour les enfants ? »

**Réponse:**
Parmi les applications de contrôle parental couramment recommandées figurent
Kids Place, Kaspersky Safe Kids, Kidslox, Qustodio, Norton Family et Kids
Zone : elles permettent de filtrer les contenus inadaptés, de suivre
l'activité en ligne et de limiter les temps de connexion. Du côté des moteurs
de recherche adaptés aux enfants, on peut citer Kiddle, KidzSearch, Kidtopia,
DuckDuckGo, Qwant Junior et YouTube Kids, qui filtrent les résultats et
limitent les publicités inadaptées.

**Mots-clés déclencheurs:** contrôle parental, application surveillance, moteur de recherche enfant, Kaspersky Safe Kids, Qustodio, YouTube Kids

---

## Annex — Additional validated scenarios (Ressources Chatbot.docx.pdf)

In addition to the 25 Version-2 scenarios above, the chatbot embeds scenarios
extracted **verbatim** from the companion document `Ressources Chatbot.docx.pdf`
(sections II and IV of "Informations"). These live in `data/qa-database.ts`;
answers and the leading keywords are copied from that PDF — nothing invented.

### 4.10 — Comment déposer une plainte auprès du parquet ?

**Profils concernés:** Victime, parent, témoin, professionnel
**Parcours:** Juridique

**Réponse (verbatim §II "Comment et où porter plainte ?", A):**
Déposez une plainte auprès du parquet du tribunal de première instance, ou
déposez une plainte en ligne via la plateforme des plaintes électroniques de la
Présidence du Ministère Public, qui permet de signaler directement les
infractions : https://plaintes.pmp.ma/

### 4.11 — Comment porter plainte auprès de la Police (E-Blagh) ?

**Réponse (verbatim §II, B — Forces de l'ordre / Police):**
Vous pouvez porter plainte auprès des services de la Police sur place ou en
ligne, sur la plateforme « E-Blagh » de la Direction Générale de la Sûreté
Nationale, dédiée à la lutte contre la cybercriminalité : https://www.e-blagh.ma/

### 4.12 — Comment porter plainte auprès de la Gendarmerie Royale ?

**Réponse (verbatim §II, B — Gendarmerie Royale):**
Vous pouvez porter plainte auprès des services de la Gendarmerie Royale sur
place, notamment lorsqu'il s'agit du milieu rural.

### 4.13 — Comment joindre le centre d'aide du Ministère de la Justice ?

**Réponse (verbatim §II, C — Ministère de la Justice):**
Le centre d'aide et d'orientation du Ministère de la Justice est disponible au
numéro +212537266600.

### 4.14 — Où s'adresser aux cellules de prise en charge des femmes et enfants victimes de violence ?

**Réponse (verbatim §II, D — Cellules de prise en charge):**
Vous pouvez vous adresser aux cellules de prise en charge des femmes et enfants
victimes de violence au sein des tribunaux de première instance et des cours
d'appel, selon le cas.

### 6.19–6.26 — Facettes du risque enfant (verbatim §IV "types de cyberviolence que votre enfant pourrait rencontrer")

The list "Cela inclut" from §IV is implemented as eight individual entries:

- 6.19 sexting — échange de contenus à caractère sexuel
- 6.20 chantage à la webcam — variante de la sextorsion
- 6.21 diffusion de rumeurs ou de fausses informations — dénigrement
- 6.22 piratage de compte / usurpation d'identité digitale
- 6.23 création d'un groupe, d'une page ou d'un sujet de discussion anti-personne
- 6.24 exposition à des contenus inappropriés
- 6.25 incitation au racisme, à la haine et à la radicalisation (punie par la loi)
- 6.26 fraude et escroquerie (utilisation des données personnelles à des fins criminelles)

Each entry pairs the verbatim definition with the validated reporting links
(evigilance.ma / cyberconfiance.ma/signalment, IWF for child-abuse material).
