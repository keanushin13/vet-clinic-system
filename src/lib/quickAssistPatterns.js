export const CLINIC_HOURS_LINE =
  "We are open Monday to Sunday, 9:00 AM to 7:00 PM. Hours may differ or we may be closed on certain public holidays, so please call the clinic to confirm.";

export const UNKNOWN_INFO_REPLY =
  "I don't have that information. Please check with the front desk or clinic staff.";

const URGENT_PET_HEALTH_REGEX =
  /\b(seizure|seizures|collapsed|unconscious|choking|can't breathe|cant breathe|cannot breathe|not breathing|gasping|bloated (abdomen|belly|stomach)|gdv|bloat|twisted stomach|poison(ed)?|toxic|antifreeze|hit by car|heat\s*stroke|heatstroke|anaphylaxis|paralyzed|paralysed|paralysis|urinary block|blocked bladder|blocked cat|pale gums|white gums|blue gums|non-?stop bleeding|bleeding heavily|swollen (face|muzzle|throat))\b/i;

const PET_HEALTH_REGEX =
  /\b(my pet is sick|my dog is sick|my cat is sick|pet is sick|not eating|won't eat|isn't eating|vomit|vomiting|diarrhea|loose stool|limping|lethargic|weak|fever|shaking|trembling|seizure|collapsed|bleeding|wound|bitten|attacked|swallowed|not drinking|losing weight|lump|bumps?|skin problem|scratching|hair loss|eye discharge|nose discharge|sneezing|coughing|breathing fast|bloated|peeing blood|bad breath|swollen face|in pain|not acting normal)\b/i;

const PET_HEALTH_SAFETY_TAIL =
  "\n\nQuick Assist is not a veterinarian or doctor, and this is not a diagnosis. Please contact or visit a PawCruz vet; go urgently if symptoms worsen or you see red flags.";

const PET_HEALTH_URGENT_REPLY =
  "This may be an emergency. Go to the nearest open veterinary hospital or emergency clinic right away, or call PawCruz if we are open. Do not wait for chat replies." +
  PET_HEALTH_SAFETY_TAIL;

const PET_HEALTH_GENERAL_REPLY =
  "If your pet seems sick, keep them calm and comfortable, offer fresh water, and monitor appetite, energy, breathing, vomiting, diarrhea, urination, and pain. Avoid human medicine unless a veterinarian prescribed it. Red flags include trouble breathing, collapse, repeated vomiting, blood, severe weakness, a hard or painful belly, seizures, pale/blue gums, or not drinking." +
  PET_HEALTH_SAFETY_TAIL;

const hasMildSymptomTopic = (normalized) =>
  /\b(vomit|vomiting|threw up|throwing up|diarrhea|loose stool|not eating|won't eat|isn't eating|loss of appetite|limping|lame|sneeze|sneezing|cough|coughing|scratching|hair loss|ear infection|ear itchy|runny eyes|runny nose|watery eyes|sick|unwell|ill)\b/.test(
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

const guidanceTail = PET_HEALTH_SAFETY_TAIL;

const replyMildSymptomGuidance = (normalized) => {
  if (/\b(vomit|vomiting|threw|throw|puking)\b/.test(normalized)) {
    return (
      "For a single episode of vomiting in an otherwise bright adult dog or cat, offer small sips of water and monitor closely. Puppies, kittens, seniors, and small pets can get dehydrated quickly. Seek urgent care for repeated vomiting, blood in vomit, inability to keep water down, pain, bloated belly, extreme tiredness, or anything that worries you." +
      guidanceTail
    );
  }

  if (/\b(diarrhea|loose stool)\b/.test(normalized)) {
    return (
      "For mild soft stool, keep fresh water available. Do not give human medicines unless your veterinarian prescribed them. Book a visit if it lasts more than a day or keeps returning. Seek urgent care for blood, black stool, severe straining, severe pain, or if the pet is very young, old, or looks unwell." +
      guidanceTail
    );
  }

  if (/\b(not eating|won't eat|isn't eating|loss of appetite)\b/.test(normalized)) {
    if (/\b(my dog|dog|puppy)\b/.test(normalized)) {
      return (
        "If your dog is not eating, check for vomiting, diarrhea, pain, weakness, bloating, breathing changes, or unusual behavior. Do not force food or give human medicine. Offer fresh water and a small amount of their usual food, then contact a vet if your dog skips more than one meal, is a puppy or senior, or has any other symptoms." +
        guidanceTail
      );
    }

    if (/\b(my cat|cat|kitten)\b/.test(normalized)) {
      return (
        "Not eating can be serious in cats. Do not force food. Check for vomiting, pain, breathing changes, or weakness. If a cat skips food for about a day, or a kitten looks weak or flat, contact a vet the same day." +
        guidanceTail
      );
    }

    return (
      "Not eating can be serious. Do not force food. Check for vomiting, diarrhea, pain, breathing changes, weakness, or unusual behavior. Contact a vet if your pet skips multiple meals, is very young or senior, or has any other symptoms." +
      guidanceTail
    );
  }

  if (/\b(limp|limping|lame)\b/.test(normalized)) {
    return (
      "For limping, keep your pet quiet and avoid stairs or running. Check paws only if it is safe. See a vet soon if the pet will not use the leg, the leg swells, or there was an injury. Go the same day for strong pain or trauma." +
      guidanceTail
    );
  }

  if (/\b(sneez|sneezing|cough|coughing|runny|watery eyes)\b/.test(normalized)) {
    return (
      "For mild snuffles, keep the pet comfortable, ensure good airflow, and watch breathing and appetite. Urgent signs include hard breathing, blue or gray gums, or not eating. Book a visit if signs linger or get worse." +
      guidanceTail
    );
  }

  if (/\b(scratch|itch|hair loss|ear)\b/.test(normalized)) {
    return (
      "Itchy skin or ears can have many causes. Avoid random human medicines. Book an exam so the clinic can check for infection, parasites, allergies, or wounds. Seek urgent care if the face or throat swells or the pet is in serious distress." +
      guidanceTail
    );
  }

  return PET_HEALTH_GENERAL_REPLY;
};

const replyOpenToday = () =>
  "Yes, we are open today from 9:00 AM to 7:00 PM on our regular schedule. Holiday hours can vary, so call the clinic if unsure.";

const replyTomorrow = () =>
  "Yes, we are open tomorrow from 9:00 AM to 7:00 PM on our regular schedule. Holiday hours can vary, so call ahead if a holiday falls on that day.";

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

const matchOpenDayTimeQuestion = (normalized) => {
  if (
    !/\b(open|hours?|operating hours?|clinic hours?|available)\b/.test(
      normalized,
    ) ||
    !hasDayName(normalized)
  ) {
    return null;
  }

  const requestedHour = parseHourFromQuestion(normalized);
  if (requestedHour === null) {
    return "Yes, we are open that day from 9:00 AM to 7:00 PM unless a holiday affects hours. Please call to confirm if unsure.";
  }

  if (requestedHour >= 9 && requestedHour < 19) {
    return "Yes, that time is within our regular clinic hours: Monday to Sunday, 9:00 AM to 7:00 PM. Holiday hours may differ, so please call to confirm.";
  }

  return "No, that time is outside our regular clinic hours. We are open Monday to Sunday, 9:00 AM to 7:00 PM. Holiday hours may differ, so please call to confirm.";
};

const matchDayComeQuestion = (normalized) => {
  if (!/\b(can i come|may i come)\b/.test(normalized)) return null;

  if (/\btoday\b/.test(normalized)) return replyOpenToday();
  if (/\btomorrow\b/.test(normalized)) return replyTomorrow();
  if (
    /\b(monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat|sunday|sun)\b/.test(
      normalized,
    )
  ) {
    return "Yes, we are open that day from 9:00 AM to 7:00 PM unless a holiday affects hours. Please call to confirm if unsure.";
  }

  return null;
};

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
      "I can help with clinic hours, services, booking questions, vaccination schedules, grooming information, payment reminders, your appointment details, and general pet-care guidance. For pet symptoms, I can share safe first steps, but a PawCruz vet should examine your pet.",
  },
  {
    id: "hours",
    match: (normalized) =>
      /^(hours|open|what time|when do you open)\s*[!.]?$/i.test(
        normalized.trim(),
      ) ||
      /\b(what are your hours|clinic hours|operating hours|business hours|opening hours|when are you open|what time are you open|what time do you close|what time do you open)\b/.test(
        normalized,
      ),
    reply: CLINIC_HOURS_LINE,
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
      /\b(can i come tomorrow|open tomorrow|are you open tomorrow)\b/.test(
        normalized,
      ),
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
      /\b(how do i book|how can i book|book an appointment|how to book)\b/.test(
        normalized,
      ),
    reply:
      "You can book an appointment from the Appointment page in your PawCruz account. Walk-ins are also accepted subject to availability.",
  },
  {
    id: "reschedule_cancel",
    match: (normalized) =>
      /\b(reschedule|cancel an appointment|cancel appointment|rebook)\b/.test(
        normalized,
      ),
    reply:
      "Open the Appointment page to review your appointment options. If you need help with a confirmed visit, call the clinic or message staff.",
  },
  {
    id: "pricing",
    match: (normalized) =>
      /\b(price|prices|rates|how much|cost\b|costs|fee|fees)\b/.test(
        normalized,
      ),
    reply:
      "Prices vary depending on the service and your pet. Please ask the front desk for exact rates.",
  },
  {
    id: "payment",
    match: (normalized) =>
      /\b(how do i pay|pay online|gcash|maya|card payment|online payment|settle|front desk payment)\b/.test(
        normalized,
      ),
    reply:
      "Payments are handled at the clinic front desk. You can review your payment history from the Payment History page.",
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
      /\b(grooming|groom|haircut|nail trim|bath)\b/.test(normalized),
    reply:
      "Yes, we offer grooming services including bath, blow dry, ear cleaning, nail trimming, and breed-specific haircuts. Please book ahead when possible.",
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
      "We may see urgent cases during clinic hours, typically Monday to Sunday, 9:00 AM to 7:00 PM. Call ahead when possible. After hours or for life-threatening emergencies, go to the nearest 24-hour veterinary emergency clinic.",
  },
  {
    id: "services",
    match: (normalized) =>
      /\b(what services|services do you offer|what do you offer)\b/.test(
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
    id: "vet_available",
    match: (normalized) =>
      /\b(is there a vet|vet available|veterinarian available)\b/.test(
        normalized,
      ),
    reply:
      "Our veterinarian sees patients during clinic hours: Monday to Sunday, 9:00 AM to 7:00 PM, except when holiday hours or special notices apply.",
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
      "Regular hours are Monday to Sunday, 9:00 AM to 7:00 PM. Some public holidays may have shorter hours or closure, so please call before visiting.",
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
  "I can't reach the AI assistant right now. Please try again in a moment, or contact the clinic staff if this is urgent.";

export const getQuickAssistAccountFallback = () =>
  "I can't reach the account assistant right now. You can still review your pet details, appointments, medical records, payments, and messages from the pet owner dashboard pages.";
