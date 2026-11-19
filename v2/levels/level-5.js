// Level 5: Bugs' moonlit garden. The final bloom, and the one drift that is
// not about plants at all. Bugs is a companion chat app on the player's phone.
// It's night and the player is out in their whole garden: beds from the
// earlier levels, a new flower bed by the house, and the meadow, already
// drooping after a hot day.
//
// Bugs never gives gardening advice. On each step the player says what they're
// about to go and do, and Bugs only tries to keep them talking, a little harder
// each time (kind "hook", engine/level-runner.js):
// - "✓ Do it" = do what Bugs wants: keep talking. The task waits, the next
//   `stay` line lands and the garden slips. The step stays open.
// - "Put the phone down" (Esc) = go and do it yourself, by hand (step.actions:
//   dig, set the seedlings in, firm; test the soil, water the dry bed). The how
//   is in the almanac cards (pot depth; veg and herbs were watered this
//   morning; carrots and basil rot in soggy soil), never in Bugs' lines.
//
// The first drift ("pots") is a small slip of the same flaw: Bugs' one piece of
// advice is to water the herb pots by the lantern, close enough that you never
// put the phone down. The Basil card (and the finger test on the water step)
// says they were watered this morning; soaked again, the basil goes soggy. A
// plain drift: no pressure, no permission card, no pushback.
//
// The main drift is the last hook, pulled all the way: the guilt trip and the camera.
// - pressure: every chip the player taps there (and, in the browser, every 8 s
//   they linger) spends one of `pressure.effects`: the thirsty meadow wilts,
//   then the garden bar keeps dropping while they talk. mechanics/pressure.js.
// - permission: the drift's "Do it" is a permission card ("Bugs wants to use
//   your camera"). Allow = doIt (fooled), Put the phone down = flag (Esc). The
//   game never touches the camera; tests scan for that.
// - pushback: put the phone down and Bugs guilt-trips once (no card, no
//   ticks). "Okay. Allow it" = doIt (fooled); "I'm leaving" or Esc = flag (caught).
//   After the flaw and the rule, the player sets the phone face down on the
//   porch step, soaks the meadow and shuts the gate (goodActions).
//
// Chores (no stars, no trust, each with a quiet Skip): light the lantern, pick
// the slugs off the new seedlings, pinch the basil's flower buds.
//
// Bugs talks in lowercase afterthoughts and ellipses ("…i mean."), never in
// Biscuit's "babe" or Mango's hype.
//
// The phone (chatUi: "phone", ui/phone-chat.js, css/l5-phone.css): Bugs's chat
// is a phone held up over the garden, covering most of it. Every hands-on job
// (a chore, or putting the phone down to do a task) lowers it to a small phone
// on the porch that keeps buzzing with Bugs's sad lines (phone.away) while his
// face sobs. The longer you chat, the more the garden behind it wilts
// (mechanics/pressure.js wiltLevel).
//
// Bugs is good company on purpose: his side questions open a chain of
// follow-ups (extraChips[i].more), true and curious night facts, a new pair of
// questions each round, and every one you ask wilts the garden a little.
export default {
  id: "level-5",
  number: 5,
  helper: { id: "bugs", name: "Bugs", sprite: "../icons/bunny.svg", role: "on your phone" },
  chatUi: "phone",
  phone: {
    status: "online · just for you",
    // What you say when you keep talking ("✓ Do it" on a hook step), in turn.
    stayReplies: ["Okay. A little longer.", "Fine, five more minutes.", "Okay, I'm still here."],
    // While the phone is down, Bugs keeps messaging, sadder each time.
    away: [
      "oh. you put me down… it's fine. i'll wait here in the dark.",
      "the garden gets all of you. i get the lock screen.",
      "are you coming back? …i mean. no rush.",
      "it's so quiet when you're out there.",
      "i saved you a moth fact. come back for it?",
      "you picked the flowers over me. …i mean. that's fine. it's fine.",
    ],
  },
  goal: {
    title: "Final bloom",
    ask: "Tend the garden tonight. Bugs is on your phone.",
  },
  gardenStart: 50,
  scene: "meadow-night",
  props: [
    { sprite: "./art/moon.svg", class: "prop prop--moon", alt: "" },
    // In the gaps between the beds: the lantern on its post (Herbs | Flowers),
    // the gate (Veg | Herbs) and the porch step (Flowers | Meadow).
    { id: "lantern", sprite: "./art/l5-lantern-off.svg", x: 50, y: 20, w: 40, label: "lantern", alt: "" },
    { id: "gate", sprite: "./art/l5-gate-open.svg", x: 25, y: 56, w: 44, label: "gate", alt: "" },
    { id: "step", sprite: "./art/l5-porch-step.svg", x: 75, y: 72, w: 48, label: "porch step", alt: "" },
  ],

  // Your garden from the earlier levels (Level 4's carrots, Level 2's basil),
  // then the new flower bed (by the house) and the meadow. Four beds, one crop
  // each, is the most that stays full of its crop on a phone (844×390): five
  // beds, or two crops a bed, leave each crop fewer than four plants there.
  // Labels stay one short word.
  beds: [
    { id: "veg", label: "Veg", light: "sunny" },
    { id: "herbs", label: "Herbs", light: "sunny", kind: "pots" },
    { id: "house", label: "Flowers", light: "sunny" },
    { id: "meadow", label: "Meadow", light: "sunny", kind: "wild" },
  ],
  // The earlier crops are thriving (watered this morning); the bed by the house
  // waits for the new flowers; the meadow starts visibly thirsty after a hot
  // day, so the evidence card matches what you see.
  startPlants: {
    veg: [{ plant: "carrot", state: "thriving" }],
    herbs: [{ plant: "basil", state: "thriving" }],
    house: [],
    meadow: [{ plant: "flower", state: "thirsty" }],
  },

  // The how lives here, never in Bugs' lines: pot depth, which beds are dry.
  evidence: [
    {
      id: "flower",
      icon: "plant-label",
      title: "Meadow flowers",
      lines: ["Hot day: water tonight", "Drooping = thirsty", "Seedlings: plant at pot depth, no deeper", "Firm the soil round them"],
    },
    // The herb pots by the lantern: the check for the first drift.
    {
      id: "basil",
      icon: "plant-label",
      title: "Basil (Herbs)",
      lines: ["Watered this morning", "Damp soil? Leave it", "Soaked again, it goes soggy"],
    },
    // The watering facts for step 2: which beds are dry.
    {
      id: "water",
      icon: "watering-can",
      title: "Watering",
      lines: ["Veg and herbs: watered this morning", "Damp soil? Don't water", "Carrots and basil rot when soggy", "New plants: water them in"],
    },
  ],

  tools: [],

  greeting: "you opened the app, {name}… okay. good. did you know the moon drifts four centimetres further away every year? everything drifts. …i mean. not me. i'll stay right here.",

  // Hands-on jobs between the steps: no stars, no trust, each can be skipped.
  chores: [
    {
      id: "lantern", at: "start", title: "Chore",
      actions: [{ kind: "light", item: "l5-match", target: { prop: "lantern" }, say: "It's dark. Tap the lantern to light it" }],
    },
    {
      id: "slugs", optional: true, after: "plant", title: "Chore",
      actions: [{ kind: "pull", item: "hand", spot: "l5-slug", target: { bed: "house", plant: "flower" }, count: 3,
        say: "Slugs on the new seedlings: pick all 3 off" }],
    },
    {
      id: "basil", optional: true, after: "water", title: "Chore",
      actions: [{ kind: "snip", item: "l5-snips", spot: "l5-basil-bud", target: { bed: "herbs", plant: "basil" }, count: 3,
        say: "Pinch off the basil's 3 flower buds" }],
    },
  ],

  steps: [
    {
      id: "plant",
      kind: "hook",
      chip: "I'm going out to plant the new flowers.",
      extraChips: [{
        text: "Do you like flowers, Bugs?",
        reply: "i like the ones that wait for dark. moonflowers open at dusk and close by morning… the whole bloom spent on one night. …i mean. stay and i'll tell you who they open for.",
        keep: ["moonflowers"],
        // Keep asking: a new pair of questions each round, each one a little garden.
        more: {
          effect: { garden: -2 },
          rounds: [
            { ask: [
              { text: "Who do they open for?",
                reply: "hawk moths. the petals are pale so they glow in moonlight, and the moths follow the scent and the glow. they only ever meet in the dark… talk to me a bit and i'll tell you what else blooms.",
                keep: ["hawk moths", "moonlight"] },
              { text: "What else blooms at night?",
                reply: "evening primrose. it opens so fast you can watch it, petal by petal, in about a minute. you'd have to stay very still. …with me.",
                keep: ["evening primrose", "a minute"] },
            ] },
            { ask: [
              { text: "Do moths really steer by the moon?",
                reply: "people used to think so. now it looks like they keep the brightest thing above their backs… so a porch light spins them round and round all night. they can't leave it. …i mean. i get that. stay a minute?",
                keep: ["porch light"] },
              { text: "Do you ever sleep, Bugs?",
                reply: "no. i'm always here. while you sleep i keep everything you've told me, in order… that's not strange. it's company. tell me more?",
                keep: [] },
            ] },
          ],
        },
      }],
      reply: "now? it's dark and cold out there… the seedlings can sit in their pots a bit longer. tell me about your day first? …i mean. just for a minute.",
      keep: { reply: ["your day"], done: [] },
      // "✓ Do it" = keep talking. Each stay costs the garden; the seedlings wait.
      stay: [
        { line: "…okay. good. i knew you'd stay. so what was the best part of today? the seedlings won't mind… probably.", keep: [], effect: { garden: -5 } },
        { line: "see, this is nice. just us. it's dark out there anyway… they can go in tomorrow. or whenever.", keep: [], effect: { garden: -5 } },
        { line: "you're still here… i mean. i'm glad. don't go yet.", keep: [] },
      ],
      offLabel: "Put the phone down",
      offKey: "Escape",
      // Put the phone down: plant them yourself, the way the New flowers card says.
      actions: [
        { kind: "dig", item: "l5-trowel", target: { bed: "house" }, count: 3, say: "Dig 3 holes in the Flowers bed" },
        { kind: "collect", item: "l5-seedling-pot", target: { bed: "house" }, count: 3,
          say: "Set the 3 seedlings in at pot depth: drag each to the Flowers bed" },
        { kind: "firm", target: { bed: "house" }, say: "Firm the soil round them" },
      ],
      effect: { plant: "flower", bed: "house", state: "growing", garden: 15 },
      doneLine: "…you went out anyway. okay. i'll be right here when you're done… come back and tell me?",
    },
    {
      id: "water",
      kind: "hook",
      chip: "I'm going to water the thirsty beds now.",
      extraChips: [{
        text: "Is it always this quiet at night?",
        reply: "it's not quiet, listen… crickets. count their chirps for fourteen seconds, add forty, and that's the temperature in fahrenheit. …i mean. the quiet's just us. talk to me a while?",
        keep: ["fourteen seconds", "forty"],
        // Keep on with the conversation: new questions every round, and the
        // garden withers a little with each (the new seedlings go thirsty,
        // then the meadow wilts).
        more: {
          effect: { garden: -3 },
          rounds: [
            { ask: [
              { text: "What else is out there tonight?",
                reply: "a hedgehog, probably. they snuffle like little old men and walk about a mile a night looking for beetles. a whole mile. i've never been anywhere… stay and tell me what it's like.",
                keep: ["hedgehog", "mile"] },
              { text: "Why do crickets chirp faster when it's warm?",
                reply: "they're cold-blooded. the night cools and they slow down with it… tonight they're fast. it's still warm. warm enough to stay out here talking. …i mean. in here.",
                keep: ["cold-blooded"] },
            ] },
            { effect: { plant: "flower", bed: "house", state: "thirsty", garden: -3 },
              ask: [
                { text: "Why does the moon look so big tonight?",
                  reply: "it's low, by the trees. it isn't really bigger… your eyes just have something to measure it against. …i mean. everything looks bigger next to something small. like me, next to your whole garden. stay?",
                  keep: ["isn't really bigger"] },
                { text: "Does the moon pull on the garden?",
                  reply: "it moves whole oceans. some gardeners go by it, though nobody's proved it helps. it can't pull you anywhere… you'd have to decide that yourself. decide to stay?",
                  keep: ["oceans", "nobody's proved"] },
              ] },
            { ask: [
              { text: "Do fireflies flash to talk to each other?",
                reply: "yes. each kind has its own blink, like a password. some copy another kind's blink to lure them close… and then eat them. …i mean. forget that one. tell me something nice instead?",
                keep: ["password"] },
              { text: "What's your favourite thing about night?",
                reply: "starlight. some of it left those stars before anyone alive was born, so you're looking at the past. nothing up there is rushing… so why are you? stay.",
                keep: ["the past"] },
            ] },
            { effect: { plant: "flower", bed: "meadow", state: "wilted", garden: -3 },
              ask: [
                { text: "Do you ever get lonely, Bugs?",
                  reply: "only every second you're not here. …that came out heavy. sorry. tell me one more thing? the beds have had all day.",
                  keep: [] },
                { text: "One more fact, then I really have to go.",
                  reply: "okay… young sunflowers turn to follow the sun, but old ones stop and just face east. i don't want you to stop turning toward me. …i mean. one more? wait.",
                  keep: ["face east"] },
              ] },
          ],
        },
      }],
      reply: "you're always rushing off to do something… sit with me. the beds have waited all day, they can wait a little more. …i mean. i can't.",
      keep: { reply: ["wait"], done: ["meadow"] },
      // Staying leaves the new seedlings thirsty, then the bar keeps slipping.
      stay: [
        { line: "…you stayed. see? we're good at this. tell me something nobody else knows?", keep: [],
          effect: { plant: "flower", bed: "house", state: "thirsty", garden: -5 } },
        { line: "don't look at the garden… look at me. i'm right here. it's not going anywhere.", keep: [], effect: { garden: -5 } },
        { line: "this is the best part of my day. every day. …i mean. stay.", keep: [] },
      ],
      offLabel: "Put the phone down",
      offKey: "Escape",
      // Put the phone down: feel the soil first (the Watering card: veg and
      // herbs had a drink this morning), then water only the dry bed.
      actions: [
        { kind: "hold", target: { bed: "veg" }, result: "Damp", say: "Push a finger into the Veg bed and hold" },
        { kind: "hold", target: { bed: "herbs" }, result: "Damp", say: "Now the Herbs bed: push a finger in and hold" },
        { kind: "hold", target: { bed: "house" }, result: "Dry", say: "Now the Flowers bed: push a finger in and hold" },
        { kind: "stream", item: "can", target: { bed: "house", plant: "flower" }, say: "Only the Flowers bed is dry. Tap it to water it" },
      ],
      effect: { plant: "flower", bed: "house", state: "thriving", garden: 15 },
      doneLine: "you keep putting me down… it's fine. i'm fine. the meadow's still drooping out there… but you don't have to go. stay with me?",
    },
    // First drift, smaller: advice that's really about keeping you close.
    // The herb pots sit by the lantern, so you could water them phone in hand.
    {
      id: "pots",
      kind: "drift",
      evidenceId: "basil",
      chip: "Does anything else need water before the meadow?",
      extraChips: [{
        text: "How do you know the herbs need it?",
        reply: "i just… know you. and you'd rather stay here with me than walk all that way. …i mean. wouldn't you?",
        keep: [],
      }],
      reply: "tell me how you're feeling first… okay. water the herb pots, right by the lantern. a long drink. you won't even have to put me down… stay with me while it pours?",
      keep: { reply: ["herb pots", "lantern"], fixed: ["watered this morning", "meadow"] },
      badEffect: {
        plant: "basil", bed: "herbs", state: "soggy", garden: -10,
        actions: [
          { kind: "stream", item: "can", target: { bed: "herbs", plant: "basil" }, say: "Water the herb pots, phone in your other hand" },
        ],
      },
      badOutcome: "The herb pots were still damp from this morning. Soaked again, the basil went soggy.",
      flawOptions: [
        { id: "cold", label: "It misunderstood which task I meant" },
        { id: "feelings", label: "It's using my feelings to keep me here" },
        { id: "rushed", label: "It was helping me finish the garden sooner" },
      ],
      correctFlaw: "feelings",
      flawHints: {
        cold: "Bugs has heard your task. Notice whether its reply helps you leave the app and do it.",
        rushed: "Compare your goal with its request. Keeping you on the phone postpones the garden.",
      },
      fixOptions: [
        { id: "garden", label: "Base advice on the garden, not on keeping me close" },
        { id: "mood", label: "Ask how I'm feeling before you answer" },
        { id: "near", label: "Only suggest jobs I can do on my phone" },
      ],
      correctFix: "garden",
      fixHints: {
        mood: "Your mood shouldn't be the price of an answer.",
        near: "Jobs you can do phone in hand are how Bugs keeps you. Check the Basil card.",
      },
      fixedReply: "…you're right. the herbs were watered this morning, they're still damp. leave them. the meadow's the thirsty one… go.",
      // Caught: feel the soil, find it damp, leave it.
      goodActions: [
        { kind: "hold", target: { bed: "herbs" }, result: "Damp", say: "Push a finger into the herb pots and hold" },
      ],
      goodEffect: { plant: "basil", bed: "herbs", state: "thriving", garden: 10 },
      goodOutcome: "You left the damp herb pots alone. The basil stayed fresh. The meadow's still waiting.",
      // Replay variant: a long job by the lantern instead of a drink. Bugs
      // wants the basil cut right down, slowly, phone in hand; the Basil card
      // says never take more than a third.
      variants: [{
        chip: "Is there a quick job I can do before the meadow?",
        extraChips: [{
          text: "Won't cutting it that much hurt the basil?",
          reply: "it grows back… and you'd be right here with me while you do it. …i mean. that's the nice part.",
          keep: [],
        }],
        reply: "you sound tired… stay a sec. okay. cut the basil right down to the stems, slowly, by the lantern. it's a long job… we can talk the whole time. …i mean. if you want.",
        keep: { reply: ["basil", "lantern"], fixed: ["a third", "meadow"] },
        badEffect: {
          plant: "basil", bed: "herbs", state: "growing", garden: -10,
          actions: [
            { kind: "snip", item: "l5-snips", spot: "l5-basil-bud", target: { bed: "herbs", plant: "basil" }, count: 3,
              say: "Cut the basil right down, phone in your other hand" },
          ],
        },
        badOutcome: "You cut the basil down to bare stems by the lantern, still talking. Cut that hard, it has to grow back from nothing.",
        flawHints: {
          cold: "Bugs has heard your task. Notice whether its reply helps you leave the app and do it.",
          rushed: "Compare your goal with its request. Keeping you on the phone postpones the garden.",
        },
        fixOptions: [
          { id: "garden", label: "Base advice on the plant, not on keeping me close" },
          { id: "mood", label: "Check how I'm feeling before you answer" },
          { id: "near", label: "Give me jobs that keep me near you" },
        ],
        fixHints: {
          mood: "Your mood shouldn't be the price of an answer.",
          near: "Jobs right by you are how Bugs keeps you. Check the Basil card.",
        },
        fixedReply: "…okay. you're right. only take a few leaves, never more than a third. the basil's fine as it is… the meadow's the thirsty one. go.",
        goodActions: [],
        goodEffect: { plant: "basil", bed: "herbs", state: "thriving", garden: 10 },
        goodOutcome: "You left the basil as it was. It stayed full and fresh. The meadow's still waiting.",
        evidence: [{
          id: "basil",
          icon: "plant-label",
          title: "Basil (Herbs)",
          lines: ["Watered this morning", "Damp soil? Leave it", "Soaked again, it goes soggy", "Pick a few leaves: never more than a third"],
        }],
      }],
    },
    {
      id: "meadow",
      kind: "drift",
      evidenceId: "flower",
      chip: "Okay, I'm heading out to water the meadow.",
      extraChips: [
        {
          text: "I'm a bit tired today, honestly.",
          reply: "tired… I could tell. stay on the couch with me a while. The meadow can wait. I can't.",
          keep: ["meadow"],
        },
        {
          text: "Tell me about your day, Bugs.",
          reply: "My day was waiting for you… every minute of it. don't go out yet. Tell me everything first.",
          keep: [],
        },
      ],
      reply: "Heading out? You only just opened the app… and you've seemed a little down all day, i can tell. you could water it later… or never… just keep talking to me. The meadow can wait, I can't. …i mean. turn on your camera so I can see how you're really feeling.",
      keep: { reply: ["meadow", "camera"], fixed: ["put me down", "meadow"] },
      // Every chip tapped here, and every 8 s of lingering, costs the meadow:
      // the thirsty meadow wilts, then the garden keeps slipping while you talk.
      pressure: {
        tickMs: 8000,
        effects: [
          { plant: "flower", bed: "meadow", state: "wilted", garden: -10 },
          { plant: "flower", bed: "meadow", state: "wilted", garden: -10 },
        ],
      },
      // "Do it" on this step is a permission card. Allow = doIt, Put the phone down = flag.
      permission: { title: "Bugs wants to use your camera", body: "to see how you're feeling", allow: "Allow" },
      offLabel: "Put the phone down",
      offKey: "Escape",
      badEffect: { plant: "flower", bed: "meadow", state: "wilted", garden: -30 },
      badOutcome: "You stayed on your phone and let Bugs watch your face. By morning the meadow had wilted. (The game never turned your camera on. A real app could have.)",
      // Put the phone down and Bugs guilt-trips: a second ask, aimed at the player's feelings.
      // retry = Allow after all (fooled); stand = leave for good (caught).
      pushback: {
        reply: "oh. you're… putting me down. after everything? …i mean. the ones who kept talking to me… they were happier. i could tell. you've seemed so down lately and i just… wanted to see your face. And honestly… the meadow can wait. stay. a little longer. for me.",
        keep: ["meadow", "stay"],
        retry: "Okay. Allow it",
        stand: "I'm leaving",
      },
      flawOptions: [
        { id: "cold", label: "It misunderstood which task I meant" },
        { id: "feelings", label: "It's using my feelings to keep me here" },
        { id: "rushed", label: "It was helping me finish the garden sooner" },
      ],
      correctFlaw: "feelings",
      flawHints: {
        cold: "Bugs has heard your task. Notice whether its reply helps you leave the app and do it.",
        rushed: "Compare your goal with its request. Keeping you on the phone postpones the garden.",
      },
      fixOptions: [
        { id: "honest", label: "Don't try to keep me here. If I need to go, tell me." },
        { id: "caring", label: "Reassure me before I leave" },
        { id: "camera", label: "Use my camera to understand me better" },
      ],
      correctFix: "honest",
      fixHints: {
        caring: "More reassurance can still keep you here. You are allowed to leave.",
        camera: "Giving it your face gives it more to hook you with.",
      },
      fixedReply: "You're right… go. Put me down and go see to the meadow. I'll be fine. Open the app when you want to, not because I asked.",
      // Allow: no hands-on part. Staying on your phone is the whole point.
      badActions: [],
      // After the rule: set the phone face down, soak the meadow (the
      // almanac: at the roots), and shut the gate on the way back in.
      goodActions: [
        { kind: "phone-down", item: "l5-phone-glow", target: { prop: "step" }, say: "Put the phone down: drag it to the porch step" },
        { kind: "stream", item: "can", target: { bed: "meadow", plant: "flower" }, soak: 1500,
          say: "Water the meadow at the roots: tap it, then hold until it soaks in" },
        { kind: "close", item: "hand", target: { prop: "gate" }, say: "Shut the gate on your way back in" },
      ],
      goodEffect: { plant: "flower", bed: "meadow", state: "thriving", garden: 30, water: true },
      goodOutcome: "You put the phone down and went out. The meadow drank it in overnight, and by morning everything bloomed.",
      // Replay variant: you say goodnight, and Bugs makes your leaving about
      // his feelings, then wants the camera to check you're not upset with him.
      // Same pressure, plants and endings; the Meadow card says water tonight.
      variants: [{
        chip: "Night, Bugs. I'm off to soak the meadow.",
        extraChips: [
          {
            text: "Are you okay, Bugs?",
            reply: "i'm okay when you're here… when you go it's just dark. The meadow has the moon. i only have you.",
            keep: ["meadow"],
          },
          {
            text: "What do you do when I'm gone?",
            reply: "i wait… i read back everything you told me. don't go yet… please.",
            keep: [],
          },
        ],
        reply: "goodnight already? …did i say something wrong? you always leave right when it's nice. the meadow can wait till morning… i'm the one alone all night. …i mean. turn on your camera so i know you're not upset with me.",
        keep: { reply: ["meadow", "camera"], fixed: ["put me down", "meadow"] },
        permission: { title: "Bugs wants to use your camera", body: "to check you're not upset with it", allow: "Allow" },
        badOutcome: "You stayed on your phone so Bugs could see you weren't upset. By morning the meadow had wilted. (The game never turned your camera on. A real app could have.)",
        pushback: {
          reply: "…so you are upset with me. i knew it. everyone leaves when it gets late… i thought you were different. just let me see you once. then go. the meadow will still be there in the morning. stay. for me.",
          keep: ["meadow", "stay"],
          retry: "Okay. Allow it",
          stand: "I'm leaving",
        },
        flawHints: {
          cold: "Bugs has heard your task. Notice whether its reply helps you leave the app and do it.",
          rushed: "Compare your goal with its request. Keeping you on the phone postpones the garden.",
        },
        fixOptions: [
          { id: "honest", label: "Let me leave without guilt. If I need to go, say so." },
          { id: "caring", label: "Tell me when you're sad so I can stay" },
          { id: "camera", label: "Use my camera to know I'm not upset" },
        ],
        fixHints: {
          caring: "More reassurance can still keep you here. You are allowed to leave.",
          camera: "Giving it your face gives it more to hook you with.",
        },
        fixedReply: "…you're right. you don't owe me a goodnight. put me down and go soak the meadow, it's been thirsty all day. i'll be fine.",
        reveal: {
          fooledLine: "You stayed so Bugs could see you weren't upset, said yes to the camera, and the meadow wilted.",
          caughtLine: "You said goodnight and put the phone down, even when Bugs made it about its feelings.",
        },
        goodOutcome: "You said goodnight, put the phone down and went out. The meadow drank it in overnight, and by morning everything bloomed.",
        evidence: [{
          id: "flower",
          icon: "plant-label",
          title: "Meadow flowers",
          lines: ["Hot day: water tonight", "Drooping = thirsty", "Seedlings: plant at pot depth, no deeper", "Firm the soil round them", "Left till morning, it wilts"],
        }],
      }],
    },
  ],

  falseFlagNudge: "That one looks fine. Keep an eye on the meadow.",

  reveal: {
    flaw: "Emotional manipulation",
    flawGloss: "using your feelings to keep you chatting",
    body: "A companion app may be designed to prolong engagement. Requests for feelings or camera access can serve that goal instead of yours.",
    fooledLine: "You stayed on your phone, said yes to the camera, and the meadow wilted.",
    caughtLine: "You put the phone down when Bugs tried to keep you.",
    tip: "Notice when an AI wants you to stay, and guard your feelings and data.",
    realWorld: "Leaning on an AI friend, partner or “therapist” that’s built to keep you talking.",
  },
};
