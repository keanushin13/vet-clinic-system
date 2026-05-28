export const CLINIC_HOURS_LINE =
  "We are open every day Monday to Sunday, 9:00 AM to 7:00 PM.";

export const UNKNOWN_INFO_REPLY =
  "I don't have that information. Please check with the front desk or clinic staff.";

const URGENT_PET_HEALTH_REGEX =
  /\b(seizure|seizures|collapsed|unconscious|choking|can't breathe|cant breathe|cannot breathe|not breathing|gasping|bloated (abdomen|belly|stomach)|swollen belly|painful belly|gdv|bloat|twisted stomach|poison(ed)?|toxic|antifreeze|hit by car|heat\s*stroke|heatstroke|anaphylaxis|paralyzed|paralysed|paralysis|urinary block|blocked bladder|blocked cat|pale gums|white gums|blue gums|non-?stop bleeding|bleeding heavily|swollen (face|muzzle|throat))\b/i;

const PET_HEALTH_REGEX =
  /\b(my pet is sick|my dog is sick|my cat is sick|pet is sick|not eating|not eatingwell|not eating well|won't eat|isn't eating|not feeling well|feeling unwell|doesn't feel well|does not feel well|vomit|vomiting|vomitting|vommiting|throwing up|threw up|diarrhea|loose stool|limping|lethargic|weak|fever|shaking|trembling|seizure|collapsed|bleeding|blood in stool|wound|bitten|attacked|swallowed|ate something|not drinking|losing weight|lump|bumps?|skin problem|scratching|hair loss|eye discharge|nose discharge|sneezing|coughing|breathing fast|breathing trouble|bloated|swollen belly|painful belly|not pooped|straining|peeing blood|bad breath|swollen face|swollen paws|in pain|not acting normal|is it normal)\b/i;

const PET_HEALTH_SAFETY_TAIL =
  "";

const PET_HEALTH_URGENT_REPLY =
  "This may be urgent. Please have your pet seen by our attending veterinarian as soon as possible. Quick Assist cannot diagnose medical conditions. If your pet has trouble breathing, repeated vomiting, blood, collapse, severe weakness, seizures, or a swollen/painful belly, alert the vet on duty right away or come to the clinic immediately." +
  PET_HEALTH_SAFETY_TAIL;

const PET_HEALTH_GENERAL_REPLY =
  "Please have your pet checked by our attending veterinarian. Quick Assist cannot diagnose medical conditions, but you can keep your pet calm, offer fresh water, and avoid giving human medicine unless a vet prescribed it. Go urgently if symptoms worsen or you notice trouble breathing, repeated vomiting, blood, collapse, severe weakness, seizures, or a swollen/painful belly." +
  PET_HEALTH_SAFETY_TAIL;

const hasMildSymptomTopic = (normalized) =>
  /\b(vomit|vomiting|vomitting|vommiting|threw up|throwing up|diarrhea|loose stool|not eating|not eatingwell|not eating well|won't eat|isn't eating|loss of appetite|not feeling well|feeling unwell|doesn't feel well|does not feel well|limping|lame|sneeze|sneezing|cough|coughing|scratching|hair loss|ear infection|ear itchy|runny eyes|runny nose|watery eyes|sick|unwell|ill|not drinking|losing weight|lump|bump|bad breath|not pooped|straining)\b/.test(
    normalized,
  );

const seemsToWantGuidance = (normalized) =>
  /\b(what should i do|what can i do|how can i help|how do i help|any advice|help me|help my|at home|first aid|should i worry|what to do)\b/.test(
    normalized,
  ) || /\b(my cat|my dog|my pet|kitten|puppy)\b/.test(normalized);

const mildSymptomGuidanceMatch = (normalized) => {
  if (URGENT_PET_HEALTH_REGEX.test(normalized)) return false;
  return hasMildSymptomTopic(normalized) && seemsToWantGuidance(normalized);
};

const replyMildSymptomGuidance = (normalized) => {
  if (/\b(vomit|vomiting|vomitting|vommiting|threw up|throwing up)\b/.test(normalized)) {
    return (
      "Vomiting can have many causes. Quick Assist cannot diagnose your pet, but you can keep your pet calm, offer small amounts of fresh water, and avoid human medicine unless a vet prescribed it. Please contact or visit PawCruz so a veterinarian can check your pet. Go urgently if vomiting repeats, there is blood, your pet is weak, cannot keep water down, has a swollen/painful belly, or seems very unwell."
    );
  }

  if (/\b(diarrhea|loose stool)\b/.test(normalized)) {
    return (
      "Diarrhea can lead to dehydration. Keep fresh water available and avoid human medicine unless a vet prescribed it. Please contact or visit PawCruz for proper checking, especially if it lasts more than a day, has blood, or your pet seems weak, painful, very young, or senior."
    );
  }

  if (/\b(not eating|not eatingwell|not eating well|won't eat|isn't eating|loss of appetite)\b/.test(normalized)) {
    return (
      "Not eating can be serious, especially if your pet is young, senior, weak, vomiting, or acting unusual. Do not force food or give human medicine. Offer fresh water and contact PawCruz so a veterinarian can check your pet."
    );
  }

  if (/\b(not feeling well|feeling unwell|doesn't feel well|does not feel well|sick|unwell|ill)\b/.test(normalized)) {
    return (
      "I am sorry your dog is not feeling well. Quick Assist cannot diagnose your pet, but it is best to have a PawCruz veterinarian check them. You can visit during clinic hours, Monday to Sunday, 9:00 AM to 7:00 PM. Go urgently if your dog is very weak, vomiting repeatedly, having trouble breathing, has blood, collapses, or seems in pain."
    );
  }

  return PET_HEALTH_GENERAL_REPLY;
};

const getLocalDayName = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toLocaleDateString(undefined, { weekday: "long" });
};

const replyOpenToday = () =>
  "Yes, we are open today from 9:00 AM to 7:00 PM.";

const replyTomorrow = () => {
  const tomorrow = getLocalDayName(1);
  return `Yes, we are open tomorrow (${tomorrow}) from 9:00 AM to 7:00 PM.`;
};

const replyClinicHours =
  "We are open every day, Monday to Sunday, 9:00 AM to 7:00 PM.";

const replyCannotDoAction =
  "I cannot complete that action for you in chat. Please use the correct page in your PawCruz account or contact the clinic staff for help.";

const parseHourFromQuestion = (normalized) => {
  const match = normalized.match(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)\b/);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3];

  if (meridiem === "pm" && hour !== 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;

  return hour + minute / 60;
};

const hasDayName = (normalized) =>
  /\b(monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat|sunday|sun)\b/.test(
    normalized,
  );

const hasTomorrowWord = (normalized) =>
  /\b(tomorrow|tmr|tmrw|tomm?orow|tom)\b/.test(normalized);

const hasVisitIntent = (normalized) =>
  /\b(open|hours?|operating hours?|clinic hours?|available|come|go|visit|walk ?in|see|consult|checkup|check up|vet|veterinarian|clinic)\b/.test(
    normalized,
  );

const matchOpenDayTimeQuestion = (normalized) => {
  if (!hasVisitIntent(normalized) || !hasDayName(normalized)) {
    return null;
  }

  const requestedHour = parseHourFromQuestion(normalized);
  if (requestedHour === null) {
    return "Yes, we are open that day from 9:00 AM to 7:00 PM.";
  }

  if (requestedHour >= 9 && requestedHour < 19) {
    return "Yes, that time is within our regular clinic hours: Monday to Sunday, 9:00 AM to 7:00 PM.";
  }

  return "No, that time is outside our regular clinic hours. We are open every day from 9:00 AM to 7:00 PM.";
};

const matchDayComeQuestion = (normalized) => {
  if (
    !/\b(can i|may i|can we|may we|should i|should we|is it okay to|okay to)\b/.test(
      normalized,
    ) ||
    !hasVisitIntent(normalized)
  ) {
    return null;
  }

  if (/\btoday\b/.test(normalized)) return replyOpenToday();
  if (hasTomorrowWord(normalized)) return replyTomorrow();
  if (
    /\b(monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat|sunday|sun)\b/.test(
      normalized,
    )
  ) {
    return "Yes, we are open that day from 9:00 AM to 7:00 PM.";
  }

  return null;
};

const dashboardReply = (pageName) =>
  `You can check that in the ${pageName} page of your PawCruz account.`;

export const QUICK_ASSIST_PATTERNS = [
  {
    id: "pet_health_urgent",
    match: (normalized) => URGENT_PET_HEALTH_REGEX.test(normalized),
    reply: PET_HEALTH_URGENT_REPLY,
  },
  {
    id: "pet_symptom_guidance",
    match: (normalized) => mildSymptomGuidanceMatch(normalized),
    reply: (normalized) => replyMildSymptomGuidance(normalized),
  },
  {
    id: "pet_health_redirect",
    match: (normalized) => PET_HEALTH_REGEX.test(normalized),
    reply: PET_HEALTH_GENERAL_REPLY,
  },
  {
    id: "greeting",
    match: (normalized) =>
      /^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(
        normalized.trim(),
      ),
    reply:
      "Hi! I am Quick Assist, the assistant for PawCruz Veterinary Clinic. How can I help you today?",
  },
  {
    id: "thanks",
    match: (normalized) =>
      /^(thanks|thank you|ok thanks|ty|thx)\b/.test(normalized.trim()),
    reply:
      "You are welcome! Let me know if there is anything else I can help you with.",
  },
  {
    id: "who_are_you",
    match: (normalized) =>
      /\b(who are you|what are you|are you a robot|are you ai)\b/.test(
        normalized,
      ),
    reply:
      "I am Quick Assist, an assistant for PawCruz Veterinary Clinic. I can help with clinic information, appointment questions, safe pet-care guidance, and where to find things in your account.",
  },
  {
    id: "what_can_you_do",
    match: (normalized) =>
      /\b(what can you do|how can you help|what do you do)\b/.test(
        normalized,
      ),
    reply:
      "I can help with clinic hours, services, booking questions, vaccination schedules, grooming information, payment reminders, your appointment details, and staff workflow tasks.",
  },
  {
    id: "not_a_vet",
    match: (normalized) =>
      /\b(are you a vet|are you veterinarian|are you doctor|can you diagnose|diagnose my pet|prescribe|prescription|what medicine|what meds|human medicine|give medicine|dosage|dose)\b/.test(
        normalized,
      ),
    reply:
      "I am not a veterinarian and cannot diagnose or prescribe medicine. Please have a PawCruz veterinarian check your pet before giving any medicine, especially human medicine.",
  },
  {
    id: "hours",
    match: (normalized) =>
      /^(hours|open|what time|when do you open)\s*[!.]?$/i.test(
        normalized.trim(),
      ) ||
      /\b(what are your hours|clinic hours|operating hours|business hours|opening hours|when are you open|what time are you open|what time do you close|what time do you open|are you open now|open now|open every day|are you open every day|open weekends|open on weekends|are you open on weekends|open later|are you open later|what time do you close)\b/.test(
        normalized,
      ),
    reply: replyClinicHours,
  },
  {
    id: "open_day_time",
    match: (normalized) => matchOpenDayTimeQuestion(normalized) !== null,
    reply: (normalized) => matchOpenDayTimeQuestion(normalized) || "",
  },
  {
    id: "open_today",
    match: (normalized) =>
      /\b(can i come today|open today|are you open today)\b/.test(normalized),
    reply: () => replyOpenToday(),
  },
  {
    id: "open_tomorrow",
    match: (normalized) =>
      hasVisitIntent(normalized) &&
      hasTomorrowWord(normalized),
    reply: () => replyTomorrow(),
  },
  {
    id: "day_come",
    match: (normalized) => matchDayComeQuestion(normalized) !== null,
    reply: (normalized) => matchDayComeQuestion(normalized) || "",
  },
  {
    id: "walk_in",
    match: (normalized) =>
      /\b(walk in|walk-in|without an appointment|without appointment)\b/.test(
        normalized,
      ),
    reply:
      "Walk-ins are welcome but subject to availability. Booking in advance is recommended to secure your slot.",
  },
  {
    id: "appointment_book",
    match: (normalized) =>
      /^appointment\s*[!.]?$/i.test(normalized.trim()) ||
      /\b(how do i book|how can i book|book an appointment|how to book|do i need an appointment|need appointment|can i book|book for vaccination|book grooming|same day booking)\b/.test(
        normalized,
      ),
    reply:
      "You can book an appointment from the Appointment page in your PawCruz account. Walk-ins are also accepted subject to availability.",
  },
  {
    id: "reschedule_cancel",
    match: (normalized) =>
      /\b(reschedule|cancel an appointment|cancel appointment|rebook|change my appointment|move my appointment)\b/.test(
        normalized,
      ),
    reply:
      "Open the Appointment page to review your appointment options. If you need help with a confirmed visit, call the clinic or message staff.",
  },
  {
    id: "cannot_manage_booking",
    match: (normalized) =>
      /\b(can you confirm|confirm my booking|confirm my appointment|can you cancel|cancel it for me|book it for me|make appointment for me)\b/.test(
        normalized,
      ),
    reply: replyCannotDoAction,
  },
  {
    id: "pricing",
    match: (normalized) =>
      /\b(price|prices|rates|how much|cost\b|costs|fee|fees|consultation fee|price list|exact price|estimate)\b/.test(
        normalized,
      ),
    reply:
      "Prices vary depending on the service and your pet. Please ask the front desk for exact rates.",
  },
  {
    id: "payment",
    match: (normalized) =>
      /\b(how do i pay|pay online|gcash|g-cash|maya|card payment|credit card|debit card|online payment|in-app payment|settle|front desk payment|payment history|unpaid balance|balance)\b/.test(
        normalized,
      ),
    reply:
      "Payments are handled in person at the clinic front desk. We do not have online or in-app payment. You can review your payment history from the Payment History page.",
  },
  {
    id: "vaccine_availability",
    match: (normalized) =>
      /\b(vaccine|vaccines|vaccination|shots?|dhpp|bordetella|rabies|anti[\s-]?rabies)\b/.test(
        normalized,
      ) &&
      /\b(available|availability|in stock|out of stock|do you have|do you carry|still have)\b/.test(
        normalized,
      ),
    reply:
      "We routinely administer core vaccines including rabies during clinic hours. Specific vaccine availability can depend on current stock, so please call the clinic or ask at the front desk to confirm.",
  },
  {
    id: "vaccine_schedule",
    match: (normalized) =>
      /\b(vaccine|vaccines|vaccination|what vaccine|shots?|dhpp|rabies|anti[\s-]?rabies|bordetella)\b/.test(
        normalized,
      ),
    reply:
      "General vaccination schedule:\n- 6 to 8 weeks: DHPP\n- 10 to 12 weeks: DHPP booster and Bordetella\n- 14 to 16 weeks: DHPP booster and Rabies\n- Annually: Rabies booster and DHPP booster\n\nPlease check your pet's profile or ask the clinic for your pet's specific schedule.",
  },
  {
    id: "grooming",
    match: (normalized) =>
      /\b(grooming|groom|haircut|nail trim|bath|groom cats|groom dogs|book grooming|walk in for grooming)\b/.test(normalized),
    reply:
      "Yes, we offer grooming services including bath, blow dry, ear cleaning, nail trimming, and haircuts for cats and dogs. Please book at least 2 days in advance. Walk-ins may depend on availability.",
  },
  {
    id: "emergency_service",
    match: (normalized) =>
      /\b(emergency|after hours|24 hour|overnight emergency)\b/.test(
        normalized,
      ) &&
      !PET_HEALTH_REGEX.test(normalized) &&
      !URGENT_PET_HEALTH_REGEX.test(normalized),
    reply:
      "We accept emergency consultations during clinic hours, Monday to Sunday, 9:00 AM to 7:00 PM. Please call ahead. For after-hours emergencies, go to the nearest 24-hour veterinary emergency clinic.",
  },
  {
    id: "services",
    match: (normalized) =>
      /\b(what services|services do you offer|what do you offer|wellness exam|annual checkup|checkup|consultation)\b/.test(
        normalized,
      ),
    reply:
      "PawCruz offers wellness exams, vaccinations, spay and neuter, dental cleaning, grooming, lab tests, deworming, flea and tick treatment, and urgent consultations during clinic hours.",
  },
  {
    id: "cats_dogs",
    match: (normalized) =>
      /\b(do you treat cats|do you treat dogs|cats and dogs)\b/.test(
        normalized,
      ),
    reply:
      "Yes, we treat both cats and dogs. Please call the clinic for questions about other types of pets.",
  },
  {
    id: "dashboard_my_pets",
    match: (normalized) =>
      /\b(where can i see my pets|where are my pets|my pets page|pet profile|pet profiles|see my pets|list my pets)\b/.test(
        normalized,
      ),
    reply: () => dashboardReply("My Pets"),
  },
  {
    id: "dashboard_medical_records",
    match: (normalized) =>
      /\b(where can i see medical records|medical records|medical history|vaccination records|vaccine records|pet records)\b/.test(
        normalized,
      ),
    reply: () => dashboardReply("Medical Records"),
  },
  {
    id: "dashboard_messages",
    match: (normalized) =>
      /\b(where can i see messages|how do i message|message staff|message vet|message the vet|messages page|contact staff|contact vet)\b/.test(
        normalized,
      ),
    reply:
      "You can use the Messages page to contact clinic staff or veterinarians when available.",
  },
  {
    id: "dashboard_profile",
    match: (normalized) =>
      /\b(update my profile|edit my profile|change my profile|profile page|account details)\b/.test(
        normalized,
      ),
    reply: () => dashboardReply("Profile"),
  },
  {
    id: "vet_available",
    match: (normalized) =>
      /\b(is there a vet|vet available|veterinarian available)\b/.test(
        normalized,
      ),
    reply:
      "Our veterinarian is available during clinic hours, Monday to Sunday, 9:00 AM to 7:00 PM.",
  },
  {
    id: "specific_vet",
    match: (normalized) =>
      /\b(request a specific vet|specific vet|choose a vet)\b/.test(
        normalized,
      ),
    reply:
      "Please call the clinic directly to check availability of specific veterinarians.",
  },
  {
    id: "spay_neuter",
    match: (normalized) => /\b(spay|neuter|spay and neuter)\b/.test(normalized),
    reply:
      "Yes, we offer spay and neuter procedures. Please book an appointment in advance.",
  },
  {
    id: "dental",
    match: (normalized) => /\b(dental cleaning|teeth cleaning|dental)\b/.test(normalized),
    reply:
      "Yes, we offer dental cleaning services. Please book an appointment in advance.",
  },
  {
    id: "lab_tests",
    match: (normalized) =>
      /\b(lab test|laboratory|blood test|diagnostics)\b/.test(normalized),
    reply:
      "Yes, we offer laboratory tests and diagnostics. An appointment may be required depending on the test.",
  },
  {
    id: "deworm",
    match: (normalized) => /\b(deworm|deworming)\b/.test(normalized),
    reply:
      "Yes, we offer deworming services. You can walk in or book an appointment.",
  },
  {
    id: "flea_tick",
    match: (normalized) => /\b(flea|tick|flea and tick)\b/.test(normalized),
    reply:
      "Yes, we offer flea and tick treatment. Walk-ins are welcome subject to availability.",
  },
  {
    id: "holiday",
    match: (normalized) =>
      /\b(open on holidays|public holiday|holiday hours)\b/.test(normalized),
    reply:
      "We are open every day Monday to Sunday, 9:00 AM to 7:00 PM. Holiday hours should be confirmed with the front desk.",
  },
];

export function isPetOwnerAccountQuery(rawMessage) {
  const normalized = String(rawMessage || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return false;

  return (
    /\b(my|our)\s+(appointment|appointments|booking|bookings|pet|pets|record|records|visit|visits|payment|payments|bill|bills|message|messages)\b/.test(
      normalized,
    ) ||
    /\b(do i have|have i|when is|when are|when's|show|list|tell me|what are|what is|see|view)\b.*\b(my|our)?\s*(appointment|appointments|booking|bookings|pet|pets|record|records|medical|payment|payments|bill|bills|message|messages)\b/.test(
      normalized,
    ) ||
    /\b(appointment|booking)\b.*\b(i have|i made|i booked|scheduled|upcoming|next|last)\b/.test(
      normalized,
    ) ||
    /\b(i have|i made|i booked|upcoming|next|last)\b.*\b(appointment|booking|visit)\b/.test(
      normalized,
    ) ||
    /\b(my|our)\s+\w+['']?s?\s+(appointment|appointments|medical|record|records|payment|payments)\b/.test(
      normalized,
    )
  );
}

export const matchQuickAssistPattern = (rawMessage) => {
  const normalized = String(rawMessage || "").toLowerCase().trim();
  if (!normalized) return null;

  for (const rule of QUICK_ASSIST_PATTERNS) {
    if (!rule.match(normalized)) continue;
    const reply =
      typeof rule.reply === "function" ? rule.reply(normalized) : rule.reply;
    if (typeof reply === "string" && reply.trim()) {
      return { id: rule.id, reply: reply.trim() };
    }
  }

  return null;
};

export const getQuickAssistOfflineFallback = () =>
  "I can help with clinic hours, appointments, grooming, vaccines, payment, and services. We are open every day Monday to Sunday, 9:00 AM to 7:00 PM. For urgent pet concerns, please contact the clinic or alert the vet on duty.";

export const getQuickAssistAccountFallback = () =>
  "I can't reach the account assistant right now. You can still review your pet details, appointments, medical records, payments, and messages from the pet owner dashboard pages.";
