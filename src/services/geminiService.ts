const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// --- DYNAMIC AI PROMPTS GENERATION ---

function getPlanPrompt(goalData: any, today: Date, remainingDays: number) {
  return `
You are Atlast AI.
Generate a highly detailed, domain-specific execution plan.

Current Date: ${today.toDateString()}
Deadline: ${goalData.deadline}
Days Remaining: ${remainingDays}

Goal Title: ${goalData.title}
Goal Description: ${goalData.description}
Goal Category: ${goalData.category}
Goal Priority: ${goalData.priority}
Available Hours Per Day: ${goalData.hoursPerDay || 4}

CRITICAL RULES:
1. Return ONLY valid JSON matching the schema below.
2. The plan must contain a realistic number of milestones based on the deadline length:
   - 1 to 7 days: 4 to 8 milestones
   - 8 to 30 days: 8 to 15 milestones
   - 31 to 90 days: 15 to 30 milestones
   - 90+ days: 30 to 60 milestones
3. Do NOT generate generic or template-style milestones. Each milestone must describe specific concrete actions representing real work.
   - For Exams: syllabus analysis, unit study notes, revision index cards, PYQs sessions, MCQ assessments, timed mock tests.
   - For Coding: specification, database migrations, backend controller routes, frontend component interfaces, integration tests, live server deployment.
   - For Life Skills (like swimming/piano): breathing/kicking drills, stroke cycles coordination, floating, keyboard scales, chord exercises, two-hand pacing, endurance lap tests.
   - For Portfolios: selection, wireframes layout, coding sections, case studies curation, DNS staging, speed optimization checks.
4. Distribute milestones evenly across the remaining days. Use the "day" field (e.g. Day 1, Day 3) to represent when this milestone should be complete.
5. Workload allocation per milestone must respect the available hours per day constraint.
6. For each milestone, provide:
   - "day": integer (1 to ${remainingDays})
   - "title": specific action title
   - "description": details of execution
   - "estimatedEffort": e.g., "3 hours", "45 mins"
   - "priority": "low" | "medium" | "high"
   - "successCriteria": concrete testable success condition

Return JSON Schema:
{
  "goal_summary": "A concise summary of the goal",
  "risk_level": "healthy" | "at-risk" | "critical",
  "completion_probability": 85,
  "bottlenecks": ["list of potential schedule risk strings"],
  "milestones": [
    {
      "day": 1,
      "title": "",
      "description": "",
      "estimatedEffort": "",
      "priority": "low" | "medium" | "high",
      "successCriteria": ""
    }
  ],
  "next_action": "Title of the first milestone",
  "recovery_plan": [
    {
      "stepNumber": 1,
      "action": "",
      "estimatedTime": "",
      "impact": 15,
      "reason": ""
    }
  ]
}
`;
}

// --- PROVIDER IMPLEMENTATIONS ---

// 1. GEMINI PROVIDER
async function fetchGeminiPlan(goalData: any, apiKey: string) {
  const today = new Date();
  const deadlineDate = new Date(goalData.deadline);
  const remainingDays = Math.ceil(
    (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  const prompt = getPlanPrompt(goalData, today, remainingDays);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini status ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("No JSON found in response");
  }
  return JSON.parse(match[0]);
}

// 2. GROQ PROVIDER
async function fetchGroqPlan(goalData: any, apiKey: string) {
  const today = new Date();
  const deadlineDate = new Date(goalData.deadline);
  const remainingDays = Math.ceil(
    (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  const prompt = getPlanPrompt(goalData, today, remainingDays);

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq status ${response.status}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || "";
  return JSON.parse(text);
}

function generateHabitDailyMilestones(title: string, deadline: string, hoursPerDay: number) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const deadlineDate = new Date(deadline);
  const remainingDays = Math.max(1, Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  
  const milestones: any[] = [];
  const effortStr = hoursPerDay === 1 ? "1 hour" : `${hoursPerDay} hours`;
  
  const tLower = title.toLowerCase();

  // Define database of daily progression actions
  // Each array contains [title, description, successCriteria]
  let pianoProgression: Array<[string, string, string]> = [
    // Phase 1: Keyboard Familiarity (1-3)
    ["Learn keyboard layout and notes placement", "Study the white and black key groupings and identify Middle C.", "Can name all white keys and locate Middle C instantly."],
    ["Master finger numbering convention (1 to 5)", "Practice finger tapping from finger 1 (thumb) to finger 5 (pinky) on both hands.", "Taps correct finger sequences without hesitation."],
    ["Hand posture and wrist relaxation exercises", "Maintain a curved 'bubble-holding' hand posture and test wrist flexibility.", "Maintains correct curved finger posture on keys."],
    
    // Phase 2: Basic Technique (4-10)
    ["C Major scale right hand only practice", "Practice ascending and descending C major scale with the right hand.", "Play right hand C major scale at 60bpm smoothly."],
    ["C Major scale left hand only practice", "Practice ascending and descending C major scale with the left hand.", "Play left hand C major scale at 60bpm smoothly."],
    ["C Major scale hands together coordination", "Slowly combine right and left hands to play the C major scale in parallel.", "Ascend and descend hands together with zero pauses."],
    ["G Major scale hands separate practice", "Learn the G major scale with F# accidental using hands separately.", "Play G major scale correctly with proper finger crossings."],
    ["G Major scale hands together coordination", "Combine hands to play the G major scale in parallel motion.", "Play G major scale hands together at 60bpm smoothly."],
    ["Finger independence stretching drills", "Perform finger lifting exercises holding down other keys (Hanon 1 intro).", "Lift individual fingers cleanly without key leakage."],
    ["Five-finger patterns coordination check", "Play five-finger pattern transitions across C, G, D, and F keys.", "Transition between patterns on cue without stopping."],
    
    // Phase 3: Chord Training (11-20)
    ["Play C major triad chord shape", "Fret and play the C major triad (C-E-G) with both hands separate.", "Play C triad clearly with all three notes sounding simultaneously."],
    ["Play G major triad chord shape", "Fret and play the G major triad (G-B-D) with both hands separate.", "Play G triad cleanly with solid finger alignment."],
    ["Play A minor chord shape", "Learn and play the A minor triad (A-C-E) to introduce minor voicing.", "Play Am triad with correct finger placement."],
    ["Play F major chord shape", "Fret and play the F major triad (F-A-C) with both hands separate.", "Play F triad cleanly without finger overlap."],
    ["C to G chord transition transitions practice", "Practice switching back and forth between C and G major chords.", "Perform 10 transitions in under 30 seconds smoothly."],
    ["Am to F chord transition transitions practice", "Practice switching back and forth between A minor and F major chords.", "Perform 10 transitions in under 30 seconds smoothly."],
    ["C-G-Am-F chord progression pacing workout", "Play the common progression C-G-Am-F with 4 beats per chord.", "Complete 4 progression loops in perfect tempo."],
    ["Play basic arpeggios pattern configurations", "Play broken chords (arpeggios) ascending and descending in C and G.", "Play arpeggios sequentially with even tone spacing."],
    ["Left hand arpeggios and chords practice", "Coordinate left-hand broken chord accompaniment with right-hand stable chords.", "Complete accompaniment loops with correct tempo."],
    ["Chord transitions with visual guide off", "Switch between C, G, Am, F without looking at your hands.", "Switch chord shapes accurately relying on tactile memory."],
    
    // Phase 4: Song Practice (21-40)
    ["Read notes sheet for Twinkle Twinkle Little Star", "Study the melody line notation sheet and identify key signatures.", "Identify all notes and rhythms of the melody."],
    ["Practice Twinkle Twinkle right hand melody", "Play the Twinkle Twinkle melody using right hand with proper fingering.", "Play right hand melody with zero rhythm mistakes."],
    ["Practice Twinkle Twinkle hands together coordination", "Combine left-hand accompaniment chords with right-hand Twinkle melody.", "Play full song hands together at target tempo."],
    ["Study notes sheet for Ode to Joy melody", "Read the notation sheet for Beethoven's Ode to Joy theme.", "Identify the pickup notes and rhythm intervals."],
    ["Practice Ode to Joy right hand phrasing", "Play the Ode to Joy right hand melody focusing on articulation.", "Play right hand phrasing with clear dynamics control."],
    ["Practice Ode to Joy hands together coordination", "Coordinate left-hand chord shell accompaniment with right-hand melody.", "Play full theme hands together without pauses."],
    ["Learn Fur Elise simplified main theme melody", "Study the notation for the simplified 'A' section of Für Elise.", "Identify the alternating E-D# chromatic opening notes."],
    ["Practice Fur Elise hands separate pacing", "Practice the right hand chromatic patterns and left hand arpeggios.", "Play both hands separately with perfect timing."],
    ["Practice Fur Elise hands together pacing", "Slowly combine hands to coordinate the opening theme of Für Elise.", "Play the theme hands together at 65bpm."],
    ["Perform all learned songs benchmark check", "Run back-to-back performances of Twinkle Twinkle, Ode to Joy, and Für Elise.", "Complete all three pieces with under 2 total mistakes."],
    ["Jingle Bells introductory reading", "Read the simplified notation sheet for the Jingle Bells chorus.", "Understand the repetitive notes structure of the main hook."],
    ["Jingle Bells hands separate practice", "Play right-hand melody and left-hand chord shells separately.", "Perform both parts separately without rhythmic stuttering."],
    ["Jingle Bells hands together coordination", "Coordinate Jingle Bells hands together with steady metronome pacing.", "Play complete chorus hands together at 80bpm."],
    ["Happy Birthday main theme reading", "Study the 3/4 triple meter notation for Happy Birthday.", "Understand the syncopated leap on the third line."],
    ["Happy Birthday right hand practice", "Practice the right hand jumps and crossings for the melody.", "Play right hand melody in perfect triple meter."],
    ["Happy Birthday hands together coordination", "Combine left hand chords with right hand Happy Birthday melody.", "Play full song hands together cleanly on cue."],
    ["Canon in D simplified reading", "Read notation for the repeating 8-note bass line of Canon in D.", "Master the repeating chord cycle structure."],
    ["Canon in D chord transitions practice", "Practice play-through of the repeating chord sequence.", "Perform 5 loops of the chord sequence without stalling."],
    ["Canon in D hands together pacing", "Coordinate the simplified right hand melody with left hand bass notes.", "Play Canon in D hands together with steady flow."],
    ["Review and record all songs performance log", "Perform and record your complete repertoire for feedback logs.", "Repertoire recorded with clean play-throughs."]
  ];

  const pianoIntermediate = [
    ["Learn extensions for D major scale", "Focus on finger crossings and wrist rotation.", "Play D major scale hands separate at 70bpm."],
    ["Practice extensions hands together pacing", "Build speed and synchronize left/right hand attacks.", "Play D major scale hands together at 70bpm."],
    ["Scale variations metronome drills", "Increase speed incrementally from 60bpm to 100bpm.", "Complete 5 speed runs with zero errors."],
    ["Study Moonlight Sonata Adagio simplified notation", "Analyze double-sharp markings and hand spacing.", "Identify all chord voicings in the opening measures."],
    ["Practice Moonlight Sonata arpeggio flows", "Smooth weight transfers between fingers.", "Play triplets fluidly with even dynamic voicing."],
    ["Practice Moonlight Sonata hands together coordination", "Align right-hand melody with left-hand octaves.", "Play first section hands together with steady pacing."],
    ["Read notation sheet for Minuet in G (Bach)", "Observe eighth-note runs and articulation slurs.", "Identify all trills and ornamentations."],
    ["Practice Minuet in G right hand articulation", "Focus on clean legato and crisp staccato phrases.", "Play right hand part with accurate note values."],
    ["Practice Minuet in G left hand counterpoint", "Independent walking bass lines sync.", "Play left hand part in steady tempo independently."],
    ["Practice Minuet in G hands together synchronization", "Master hand independence on contrapuntal themes.", "Play Minuet in G hands together at 75bpm."],
    ["Dynamic phrasing drills (crescendo & decrescendo)", "Build expressive control from pianissimo to fortissimo.", "Transition smoothly between volume levels on scales."],
    ["Practice pedaling techniques and timing", "Coordinate damper pedal changes with chord switches.", "Change pedal precisely after chord attacks without blurring."],
    ["Read sheet music for Greensleeves melody", "Master the 6/8 time signature rhythm and spacing.", "Count the 6/8 meter accurately while reading."],
    ["Practice Greensleeves left hand chord rolls", "Play broken arpeggiated accompaniment smoothly.", "Execute left-hand accompaniment rolls with steady flow."],
    ["Practice Greensleeves hands together pacing", "Execute complex syncopated hand alignments.", "Play Greensleeves hands together at target tempo."],
    ["Speed and agility drills for fingers 4 and 5", "Strengthen weak fingers using custom Hanon exercises.", "Perform five agility runs at 90bpm cleanly."],
    ["Read sheet music for Prelude in C Major (Bach)", "Identify chord patterns across each measure.", "Understand the repetitive rolling arpeggio structure."],
    ["Practice Prelude in C arpeggio pattern loops", "Maintain steady evenness throughout consecutive bars.", "Perform arpeggio loops with perfect consistency."],
    ["Practice Prelude in C hands together flow", "Coordinate smooth voicing transfers.", "Play complete Prelude in C with smooth, unbroken transitions."],
    ["Review all learned repertoire benchmark check", "Perform complete runs of learned pieces without stops.", "Complete full run-through of your current active songs catalog."]
  ];

  // Pick progression set based on title keywords
  let progression = pianoProgression;
  let intermediate = pianoIntermediate;

  if (tLower.includes("swim")) {
    progression = [
      ["Pool safety rules and shallow water adjustment", "Learn safety instructions, submerge your face, and practice breath control.", "Comfortably submerge face for 10 seconds."],
      ["Basic face-in-water breathing and bubbles drills", "Practice blowing bubbles in water and coordinating head lifts.", "Perform 15 rhythmic breathing bubble cycles."],
      ["Prone and supine glide positions practice", "Practice floating on your stomach and back in a streamlined position.", "Glide 3 meters off the wall without kicking."],
      ["Flutter kick drills using wall support", "Hold the edge of the pool and practice flutter kicks from the hips.", "Maintain a steady kick for 60 seconds."],
      ["Flutter kick propulsion with kickboard laps", "Practice flutter kicks using a kickboard for propulsion.", "Complete 1 full lap (25m) using only kickboards."],
      ["Introduce freestyle arm stroke motions", "Practice the crawl arm stroke standing in shallow water.", "Demonstrate high-elbow recoveries standing up."],
      ["Coordinate arm rotation cycle with body rolls", "Practice single arm pulls with side-breathing rotations.", "Perform 10 side-breaths with arm coordination."],
      ["Play full freestyle stroke coordination drills", "Combine kicks, strokes, and breathing in a slow crawl stroke.", "Swim 15 meters with coordinated freestyle strokes."],
      ["Breathe-to-side rotation mechanics check", "Ensure your ear stays in the water during side breathing.", "Breathe to the side without lifting your entire head."],
      ["Complete freestyle laps benchmark check", "Perform complete freestyle runs at a steady pace.", "Swim 25 meters continuously with regular breathing."],
      ["Breaststroke kick mechanics drills (frog kick)", "Practice the breaststroke leg kick using pool edge support.", "Coordinate the kick-glide rhythm correctly."],
      ["Breaststroke glide timing drills", "Practice glide phase lengths between kicks.", "Hold the glide for 3 seconds after each kick."],
      ["Coordinate breaststroke arms with frog kicks", "Practice the pull, breathe, kick, glide sequence.", "Swim 15 meters breaststroke with correct coordination."],
      ["Practice continuous breaststroke laps pacing", "Swim breaststroke laps at a steady, rhythmic pace.", "Complete 25 meters breaststroke with strong glides."],
      ["Backstroke leg kick drills without board", "Practice backstroke kicking while hugging a float or hands by side.", "Keep hips high and kick continuously for 25m."],
      ["Introduce backstroke arm cycle pacing", "Practice backstroke arm pulls standing up then in water.", "Demonstrate steady arm recovery rotation cycles."],
      ["Coordinate backstroke arms with kicks", "Swim full backstroke combining kick and arm recoveries.", "Swim 25 meters backstroke with steady breathing."],
      ["Stamina laps building: continuous 50m runs", "Practice swimming 50 meters (2 laps) without pausing.", "Complete 50m crawl with steady pacing."],
      ["Practice streamline starts off the wall", "Practice pushing off the wall in a tight, streamlined position.", "Glide past 5 meters off every wall push."],
      ["Dynamic flip turns breathing timing drills", "Practice somersaults and pushing off on your back in the pool.", "Execute 5 flip turns and glide transitions cleanly."]
    ];
    intermediate = [
      ["Interval swimming pacing drills", "Swim 4x25m freestyle intervals with 15 seconds rest.", "Complete all 4 runs with consistent times."],
      ["Freestyle bilateral breathing drills", "Breathe every 3 strokes to alternate sides.", "Swim 50 meters using bilateral breathing cleanly."],
      ["Breaststroke speed and kick efficiency runs", "Focus on generating maximal propulsion from your kick.", "Complete a lap in fewer than 12 stroke cycles."],
      ["Backstroke roll and alignment checkups", "Focus on rolling the shoulders with each arm stroke.", "Maintain straight alignment without veering sideways."],
      ["Flip turn and streamline integration", "Execute a flip turn, push-off, and streamline glide.", "Perform 3 consecutive flip turns at speed."],
      ["Endurance benchmark: 100m continuous swim", "Swim 100 meters (4 laps) continuously.", "Complete 100m freestyle with steady breathing pacing."],
      ["Butterfly kick introduction (dolphin kick)", "Practice dolphin kick motion from the chest down.", "Kick 15 meters in dolphin glide position."],
      ["Butterfly arm stroke mechanics", "Practice butterfly pulls and recoveries standing in water.", "Demonstrate clean bilateral recovery strokes."],
      ["Coordinate butterfly stroke cycles", "Combine dolphin kicks with butterfly arm strokes.", "Swim 10 meters butterfly with correct coordination."],
      ["Aerobic capacity intervals", "Swim 3x50m freestyle with 20 seconds rest.", "Maintain target pace across all intervals."],
      ["Sculling and feel-for-water drills", "Practice sculling motions with hands to build water feel.", "Propel yourself 10 meters using only sculling."],
      ["Starts and dives practice (or deep water push)", "Practice diving from blocks or strong deep pushes.", "Enter the water cleanly with minimal splash."],
      ["Under-water dolphin kick transitions", "Execute dolphin kicks off the wall before surfacing.", "Complete 3 kicks before initiating freestyle strokes."],
      ["Stroke rate acceleration drills", "Practice increasing stroke rate for sprint finishes.", "Increase stroke rate by 20% over 15 meters."],
      ["Active recovery swimming pacing", "Swim easy recovery laps focusing on relaxation.", "Maintain low heart rate while swimming 100m."],
      ["Open water sighting drills", "Practice looking forward during arm cycles.", "Sight 3 times per lap without breaking stroke rhythm."],
      ["Individual Medley introduction (IM)", "Swim 1 lap of Fly, Back, Breast, and Free.", "Complete 100m IM with legal stroke transitions."],
      ["Speed pacing benchmark sprint", "Perform a timed 50m sprint.", "Record sprint time with maximum exertion."],
      ["Endurance pacing check: 200m continuous swim", "Swim 200m (8 laps) at a sustainable aerobic pace.", "Complete 200m continuously under target time."],
      ["Final benchmark check and physical log review", "Verify overall progress and document swim metrics.", "Log metrics and outline next cycle training plan."]
    ];
  } else if (tLower.includes("guitar")) {
    progression = [
      ["Learn guitar anatomy and tuning (EADGBE)", "Understand the parts of the guitar and tune strings using a digital tuner.", "Tune all 6 strings to standard pitch correctly."],
      ["Basic finger positioning and fretting hygiene", "Practice pressing notes on the fretboard with fingertips close to frets.", "Fret notes cleanly without muting adjacent strings."],
      ["Right hand fingerpicking exercises", "Practice thumb (P) and finger (I-M-A) picking on open strings.", "Play steady plucking cycles without looking at your hand."],
      ["Play basic chromatic scale exercises", "Play the 1-2-3-4 chromatic scale pattern on each string.", "Play chromatic patterns up and down at 60bpm."],
      ["Study metronome speed drills on chromatic scales", "Increase chromatic scale speed gradually using a metronome.", "Play chromatic scales cleanly at 80bpm."],
      ["Master Em and A7 open chord shapes", "Learn the fretting positions for E minor and A7 chords.", "Form both chord shapes cleanly with all strings sounding."],
      ["Coordinate clean transitions between Em and A7 chords", "Practice switching between Em and A7 chords in rhythm.", "Transition between chords in under 2 seconds without buzz."],
      ["Learn G and C major open chord shapes", "Learn the fretting positions for G major and C major chords.", "Form G and C chord shapes cleanly with fingertips."],
      ["Practice transitions between G and C chords", "Practice switching back and forth between G and C major chords.", "Switch chords smoothly in a 4-beat rhythm pattern."],
      ["Learn D and A major chord shapes", "Learn the fretting positions for D major and A major chords.", "Form D and A chord shapes cleanly with fingertips."],
      ["Play simple G-C-D chord progression routines", "Play a G-C-D progression with 4 strum attacks per chord.", "Complete 4 progression loops in steady tempo."],
      ["Introduce basic strumming pattern (Down Down Up Up Down Up)", "Practice the common strumming pattern on a muted guitar.", "Maintain strumming pattern rhythm for 60 seconds."],
      ["Practice strumming pattern while switching chords", "Apply the strumming pattern while playing G-C-D progressions.", "Switch chords on the first beat of strumming loops."],
      ["Learn E major and E minor chord shapes", "Learn and practice E major and E minor open chord shapes.", "Fret both shapes cleanly with solid thumb support."],
      ["Play common chord transitions with metronome", "Practice chord transitions (G-Em-C-D) in steady tempo.", "Maintain perfect tempo transitions with metronome at 60bpm."],
      ["Learn F major barre chord shape (simplified)", "Fret the simplified 4-string F major chord shape.", "Play simplified F chord cleanly without muting string 1."],
      ["Finger strength drills to resolve barre fret buzz", "Practice index finger barre pressure on frets 1 to 5.", "Sound all fretted notes cleanly across barre strings."],
      ["Play full chord cycles (G-Em-C-D)", "Play the classic 4-chord pop progression in a loop.", "Play 4 loops of the progression with steady strumming."],
      ["Introduce basic fingerpicking pattern (PIMA)", "Practice the thumb-index-middle-ring picking pattern.", "Play PIMA pattern on open chords in steady time."],
      ["Practice fingerpicking pattern on open chords", "Apply the PIMA picking pattern on C, G, and Em chords.", "Complete 3 loops of fingerpicked chords in tempo."]
    ];
    intermediate = [
      ["Practice barre chord transitions", "Switch between open chords and F major barre chord.", "Perform transitions without stalling the rhythm."],
      ["Learn minor pentatonic scale shape", "Fret the first position of the A minor pentatonic scale.", "Play scale ascending and descending separate notes."],
      ["Speed drills on pentatonic scale", "Practice pentatonic scale speed runs with metronome.", "Play pentatonic scale cleanly at 90bpm."],
      ["Read guitar tablature for Redemption Song", "Study the tabs and chord symbols for the intro riff.", "Identify all notes and finger mappings in tabs."],
      ["Practice strumming cadence for Redemption Song", "Practice the syncopated strumming pattern for the song.", "Strum through chords matching the song cadence."],
      ["Coordinate full play-through of Redemption Song", "Combine the intro riff and chords in a single play-through.", "Play entire song section with zero chord breaks."],
      ["Study fingerpicking pattern for Wish You Were Here", "Practice the intro riff notes and chord transitions.", "Fret intro notes cleanly with proper timing."],
      ["Speed runs for Wish You Were Here intro", "Practice the acoustic intro riff at target tempo.", "Play intro riff cleanly at 80bpm without buzzing."],
      ["Perform full Wish You Were Here cadence", "Play the intro riff followed by the verse chord switches.", "Play the intro and verse sections consecutively in time."],
      ["Review all learned chord catalog", "Run through G, C, D, A, E, Em, Am, F, Dm shapes.", "Fret and play all chords cleanly in sequence."]
    ];
  } else if (tLower.includes("gym") || tLower.includes("workout")) {
    progression = [
      ["Warm-up routines and mobility checks", "Practice arm circles, leg swings, and dynamic stretching.", "Complete warm-up with loose joint range of motion."],
      ["Bodyweight squat form and mechanics", "Practice squats focusing on chest up, knees out, and heel drive.", "Perform 15 squat repetitions with thighs parallel to floor."],
      ["Push-up progression and core alignment", "Practice push-ups from knees or toes keeping straight bodyline.", "Perform 10 push-ups without sagging hips."],
      ["Bodyweight lunges posture exercises", "Practice forward and backward lunges focusing on balance.", "Perform 10 lunges per leg with upright posture."],
      ["Plank hold core stability check", "Hold a forearm plank focusing on glute and abdominal tension.", "Maintain straight plank alignment for 45 seconds."],
      ["Glute bridge hip extension drills", "Lie on back and drive hips up, squeezing glutes.", "Perform 15 bridges with brief squeeze holds."],
      ["Dumbbell goblet squat introduction", "Squat holding a light weight at chest level.", "Perform 10 goblet squats with solid posture."],
      ["Dumbbell overhead shoulder press", "Press dumbbells overhead from seated or standing position.", "Perform 10 presses without arching lower back."],
      ["Dumbbell bent-over rows technique", "Practice pulling dumbbells to hip level while hinged at hips.", "Perform 10 rows with flat back alignment."],
      ["Single-leg Romanian deadlift balance check", "Hinge on one leg holding a wall for support.", "Perform 8 reps per leg with controlled balance."],
      ["Dumbbell Romanian deadlift hip hinges", "Perform deadlift hinges holding dumbbells at thighs.", "Perform 10 reps feeling hamstrings stretch."],
      ["Lateral raises shoulder hypertrophy drills", "Raise light dumbbells out to sides keeping slight elbow bend.", "Perform 12 reps with controlled downward path."],
      ["Incline push-ups chest emphasis check", "Practice push-ups with hands elevated on a bench.", "Perform 12 incline push-ups with clean chest touch."],
      ["Dumbbell floor press chest workout", "Press dumbbells upward while lying flat on the floor.", "Perform 12 floor presses with elbows touching floor."],
      ["Plank-to-pushup core transitions", "Transition from forearm plank to high plank position.", "Perform 10 transitions holding hips steady."],
      ["Bodyweight step-ups leg strength", "Step onto a stable box/chair driving through front heel.", "Perform 10 step-ups per leg with zero knee wobble."],
      ["Dumbbell hammer curls arm conditioning", "Perform curls with palms facing each other.", "Perform 12 curls with minimal body swing."],
      ["Tricep dips elbow extension check", "Perform dips using a sturdy chair or bench.", "Perform 10 dips with controlled descent depth."],
      ["Bird-dog diagonal coordination hold", "Extend opposite arm and leg while on hands and knees.", "Perform 10 reps holding extensions for 2 seconds."],
      ["Cardio stamina check: jumping jacks intervals", "Execute jumping jacks continuously in timed intervals.", "Complete 3 intervals of 60 seconds steady pacing."]
    ];
    intermediate = [
      ["HIIT conditioning training circuits", "Complete 3 rounds of squats, pushups, and mountain climbers.", "Perform all movements with correct form throughout."],
      ["Dumbbell thrusters full-body workout", "Perform squat directly into dumbbell overhead press.", "Complete 10 thrusters with powerful hip drive."],
      ["Reverse lunges with weights conditioning", "Perform reverse lunges holding dumbbells at sides.", "Complete 10 weighted lunges per leg cleanly."],
      ["Renegade rows core and back sync", "Hold high plank on dumbbells and perform rows.", "Complete 8 rows keeping hips parallel to ground."],
      ["Side plank holds oblique core check", "Hold side plank on forearm focusing on hip elevation.", "Maintain side plank lift for 30 seconds per side."],
      ["Russian twists rotational core drills", "Sit with feet elevated and rotate torso side-to-side.", "Complete 20 twists holding steady balance."],
      ["Dumbbell Bulgarian split squats", "Perform split squats with back foot elevated on bench.", "Complete 8 reps per leg with controlled knee depth."],
      ["Tricep overhead extensions conditioning", "Press single dumbbell overhead using both hands.", "Complete 12 extensions keeping elbows tucked in."],
      ["Cardio pace: high knees speed intervals", "Run in place driving knees up to hip height.", "Maintain high knees pacing for 45 seconds."],
      ["Final stamina fitness benchmark review", "Log reps and times for squat, press, and plank benchmarks.", "Log metrics and review strength metrics improvements."]
    ];
  } else {
    progression = [
      ["Scope analysis and core resources catalog", "Outline learning scope, assemble guides, and configure tools.", "Prerequisites checklist drafted and verified."],
      ["Foundational terms and vocabulary index", "Learn core terminology and write definitions index cards.", "Define 10 core concepts without referencing notes."],
      ["Workspace setup and ergonomics check", "Configure software, organize materials, and verify lighting.", "Workspace configured for maximum focus block sessions."],
      ["Basic drills and core exercises part 1", "Execute simple introductory drills for the first domain section.", "Perform 5 basic drills with zero guidance assistance."],
      ["Basic drills and core exercises part 2", "Execute simple introductory drills for the second domain section.", "Perform 5 basic drills with zero guidance assistance."],
      ["Combined foundation drills pace check", "Combine first and second section drills in sequence.", "Run combined drills with steady flow pacing."],
      ["Introduce timer/metronome constraints", "Execute core drills under strict time limits.", "Complete standard drill set in under 3 minutes."],
      ["Rest, review, and posture audits", "Assess wrist/neck fatigue and audit workspace safety.", "Complete self-evaluation log of mechanics comfort."],
      ["Identify and catalog early errors patterns", "Review drill videos or outputs to isolate errors.", "List top 3 recurring errors and their corrective drills."],
      ["Foundations milestone assessment check", "Execute complete foundations checklist under testing limits.", "Achieve 90% accuracy rating on testing run."],
      ["Applied drills complexity stage 1", "Practice intermediate exercises with added variables.", "Complete 5 complex drills with steady pacing."],
      ["Applied drills complexity stage 2", "Practice intermediate exercises with target outcomes constraint.", "Complete 5 complex drills with steady pacing."],
      ["Pattern switching speed workouts", "Switch between distinct drill patterns on brief intervals.", "Maintain fluid transitions with zero pause delays."],
      ["Study and resolve common failure modes", "Isolate bottleneck steps and practice micro-movements.", "Complete 15 micro-movements trials cleanly."],
      ["Intermediate combinations drills", "Assemble individual components into complex sequences.", "Perform 3 combined sequences without stuttering."],
      ["Tactile memory and speed runs", "Perform drills with high-speed focus blocks.", "Complete sprint trials with zero structural mistakes."],
      ["Error correction feedback loop reviews", "Audit metrics logs and perform error adjustments.", "Verify zero re-occurrences of initial phase errors."],
      ["Full sequence pacing runs stage 1", "Assemble all learned drills into a continuous run.", "Complete 1-minute continuous run with clean form."],
      ["Full sequence pacing runs stage 2", "Assemble all learned drills into a continuous run.", "Complete 2-minute continuous run with clean form."],
      ["Applied benchmark assessment log reviews", "Evaluate combined drills performance against standard limits.", "Complete sequences under record target timelines."]
    ];
    intermediate = [
      ["Advanced application drills stage 1", "Introduce high-pressure speed variables.", "Achieve target output in under 90 seconds."],
      ["Advanced application drills stage 2", "Introduce complex input configurations.", "Complete all advanced trials with zero faults."],
      ["Refine micro-movements and efficiency", "Audit movement paths to minimize waste and fatigue.", "Reduce execution time by 10% through efficiency."],
      ["Perform comprehensive sequences pacing", "Perform long-duration runs in steady flow state.", "Maintain output rate for 10 minutes continuously."],
      ["Troubleshoot advanced bottlenecks", "Diagnose complex failure modes and build recovery drills.", "Resolve 3 hypothetical failure situations cleanly."],
      ["Agility and endurance speed sprint", "Execute short high-intensity sprint trials.", "Complete sprint at 120% baseline rate with zero errors."],
      ["Complete project outline design reading", "Review outline design schemas for the first showcase project.", "Approve project requirements catalog checklist."],
      ["Project component coding / layout stage 1", "Implement first project component using clean conventions.", "Staged component compiles and passes validation checks."],
      ["Project component coding / layout stage 2", "Implement second project component using clean conventions.", "Staged component compiles and passes validation checks."],
      ["Perform complete showcase play-through/review", "Test complete showcase build under record speed limits.", "Record performance metrics and write final project log."]
    ];
  }

  for (let i = 1; i <= remainingDays; i++) {
    let titleStr = "";
    let descStr = "";
    let criteriaStr = "";
    let phaseTitle = "Phase 5: Songs";

    if (i <= 3) {
      phaseTitle = "Phase 1: Keyboard Familiarity";
      const idx = Math.min(i - 1, progression.length - 1);
      titleStr = progression[idx][0];
      descStr = progression[idx][1];
      criteriaStr = progression[idx][2];
    } else if (i <= 10) {
      phaseTitle = "Phase 2: Basic Technique";
      const idx = Math.min(i - 1, progression.length - 1);
      titleStr = progression[idx][0];
      descStr = progression[idx][1];
      criteriaStr = progression[idx][2];
    } else if (i <= 20) {
      phaseTitle = "Phase 3: Chord Training";
      const idx = Math.min(i - 1, progression.length - 1);
      titleStr = progression[idx][0];
      descStr = progression[idx][1];
      criteriaStr = progression[idx][2];
    } else if (i <= 40) {
      phaseTitle = "Phase 4: Song Practice";
      const idx = Math.min(i - 1, progression.length - 1);
      titleStr = progression[idx][0];
      descStr = progression[idx][1];
      criteriaStr = progression[idx][2];
    } else {
      phaseTitle = "Phase 5: Songs";
      const intIdx = (i - 41) % intermediate.length;
      titleStr = intermediate[intIdx][0];
      descStr = intermediate[intIdx][1];
      criteriaStr = intermediate[intIdx][2];
    }

    let displayTitle = titleStr;
    if (tLower.includes("swim")) {
      displayTitle = `${title} - ${phaseTitle.replace("Keyboard Familiarity", "Water Familiarity").replace("Chord Training", "Strokes Practice").replace("Song Practice", "Stamina Building")}: ${titleStr}`;
    } else if (tLower.includes("guitar")) {
      displayTitle = `${title} - ${phaseTitle.replace("Keyboard Familiarity", "Familiarity").replace("Chord Training", "Chord Transitions").replace("Song Practice", "Tabs Practice")}: ${titleStr}`;
    } else if (tLower.includes("gym") || tLower.includes("workout")) {
      displayTitle = `${title} - ${phaseTitle.replace("Keyboard Familiarity", "Warm-ups").replace("Basic Technique", "Bodyweight Movement").replace("Chord Training", "Weighted Exercise").replace("Song Practice", "Circuits Pacing")}: ${titleStr}`;
    } else {
      displayTitle = `${title} - ${phaseTitle.replace("Keyboard Familiarity", "Foundations").replace("Basic Technique", "Core Drills").replace("Chord Training", "Applied Drills").replace("Song Practice", "First Project")}: ${titleStr}`;
    }

    const schedDate = new Date(today);
    schedDate.setDate(schedDate.getDate() + (i - 1));

    milestones.push({
      day: i,
      title: displayTitle,
      description: descStr,
      estimatedEffort: effortStr,
      priority: "medium",
      successCriteria: criteriaStr,
      plannedScheduleDate: schedDate.toISOString().slice(0, 10),
    });
  }
  return milestones;
}

// --- GLOBAL EXPORTS ---

export async function generateGoalPlan(goalData: {
  title: string;
  description: string;
  deadline: string;
  priority: string;
  category: string;
  hoursPerDay: number;
}) {


  const catLower = (goalData.category || "").toLowerCase();
  const isHabitCategory = (catLower.includes("life") || catLower.includes("habit") || catLower.includes("skill") || goalData.title.toLowerCase().includes("piano") || goalData.title.toLowerCase().includes("swim") || goalData.title.toLowerCase().includes("gym") || goalData.title.toLowerCase().includes("practice"));
  const useRecurringSession = isHabitCategory;

  if (useRecurringSession) {
    console.log("Daily Habit goal with long deadline detected. Generating daily sessions locally...");
    const milestones = generateHabitDailyMilestones(goalData.title, goalData.deadline, goalData.hoursPerDay || 1);
    return {
      goal_summary: goalData.description || `Plan targeting daily recurring sessions for: "${goalData.title}".`,
      risk_level: "healthy",
      completion_probability: 80,
      bottlenecks: [],
      milestones: milestones,
      next_action: milestones[0]?.title || "Get started",
      recovery_plan: []
    };
  }

  // 1. Try Gemini
  try {
    if (!GEMINI_API_KEY) throw new Error("Gemini API key missing");
    console.log("Attempting plan generation with Gemini...");
    return await fetchGeminiPlan(goalData, GEMINI_API_KEY);
  } catch (geminiError) {
    console.warn("Gemini plan generation failed, trying Groq:", geminiError);

    // 2. Try Groq
    try {
      if (!GROQ_API_KEY) throw new Error("Groq API key missing");
      console.log("Attempting plan generation with Groq...");
      return await fetchGroqPlan(goalData, GROQ_API_KEY);
    } catch (groqError) {
      console.warn("Groq plan generation failed, falling back to Local Planner:", groqError);

      // 3. Fallback to Local Planner
      return getLocalPlan(goalData);
    }
  }
}

// --- MISSION COMMANDER ASSISTANCE ---

function buildMissionCommandContext(goals: any[]) {
  return goals.map(g => {
    const pendingCount = g.milestones?.filter((m: any) => m.status === "pending").length || 0;
    return {
      goalId: g.id,
      title: g.title,
      status: g.status,
      completionProbability: g.completionProbability || 50,
      daysRemaining: g.daysRemaining || 0,
      priority: g.priority,
      pendingMilestoneCount: pendingCount,
      description: g.description ? (g.description.length > 200 ? g.description.substring(0, 197) + "..." : g.description) : ""
    };
  });
}

async function fetchGeminiMissionCommand(compressedGoals: any[], apiKey: string) {
  const prompt = getMissionCommandPrompt(compressedGoals);
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
  );

  if (!response.ok) throw new Error(`Gemini status ${response.status}`);
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty text candidate in response");
  return JSON.parse(text);
}

async function fetchGroqMissionCommand(compressedGoals: any[], apiKey: string) {
  const prompt = getMissionCommandPrompt(compressedGoals);
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  if (!response.ok) throw new Error(`Groq status ${response.status}`);
  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || "";
  return JSON.parse(text);
}

function getMissionCommandPrompt(compressedGoals: any[]) {
  return `
You are Atlast AI Chief of Staff.
Analyze ALL active goals and prioritize key actions.

Your job is to decide:
1. Which goal is MOST IMPORTANT right now.
2. Which goal deserves immediate focus today.
3. The exact ranking order of all goals.

Return ONLY JSON matching the schema below:

{
  "criticalGoalId": "",
  "todayFocus": "",
  "goalRanking": [],
  "reasoning": [],
  "goalScores": [
    {
      "goalId": "",
      "score": 0,
      "urgency": "",
      "reason": ""
    }
  ]
}

CRITICAL RULES:
1. Do NOT mix category templates. The reason for each goal in "reason" and "reasoning" must strictly match its specific category:
   - Exam Goals: "Exam [Goal Title] is approaching in [daysRemaining] days and has high priority."
   - Coding/Project Goals: "Project [Goal Title] deadline is approaching and core modules remain unfinished."
   - Piano/Music/Guitar Goals: "Daily practice consistency for [Goal Title] is required to build muscle memory and skill progression."
   - Swimming Goals: "Regular technique practice for [Goal Title] is required to improve endurance and stroke efficiency."
   - Habit/Life/Skill Goals: "Maintaining streak consistency for [Goal Title] prevents regression and increases long-term success."
2. Never display raw lowercase goal identifiers or raw database IDs in "todayFocus" or "reasoning".
3. The "todayFocus" must be category-specific and professional:
   - If Piano: "Today's Focus: Piano Skill Development"
   - If Swimming: "Today's Focus: Swimming Endurance Training"
   - Else: "Today's Focus: [Goal Title] Development"
4. The "goalRanking" list must contain clean titles, not IDs.

Goals data:
${JSON.stringify(compressedGoals, null, 2)}
`;
}

export async function generateMissionCommand(goals: any[]) {
  const compressed = buildMissionCommandContext(goals);

  // 1. Try Gemini
  try {
    if (!GEMINI_API_KEY) throw new Error("Gemini API key missing");
    console.log("Attempting mission command with Gemini...");
    return await fetchGeminiMissionCommand(compressed, GEMINI_API_KEY);
  } catch (geminiError) {
    console.warn("Gemini mission command failed, trying Groq:", geminiError);

    // 2. Try Groq
    try {
      if (!GROQ_API_KEY) throw new Error("Groq API key missing");
      console.log("Attempting mission command with Groq...");
      return await fetchGroqMissionCommand(compressed, GROQ_API_KEY);
    } catch (groqError) {
      console.warn("Groq mission command failed, falling back to Local:", groqError);

      // 3. Fallback to Local Planner
      return getLocalMissionCommand(goals);
    }
  }
}

// --- LOCAL DYNAMIC FALLBACK SYSTEM ---

function generateLocalMilestones(goalData: { title: string; category: string; deadline: string; hoursPerDay?: number }) {
  const today = new Date();
  const deadlineDate = new Date(goalData.deadline);
  const remainingDays = Math.max(1, Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const hoursPerDay = goalData.hoursPerDay || 4;

  let milestoneCount = 3;
  if (remainingDays <= 7) {
    milestoneCount = Math.max(4, Math.min(8, remainingDays));
  } else if (remainingDays <= 30) {
    milestoneCount = Math.max(8, Math.min(15, Math.round(remainingDays * 0.4 + 4)));
  } else if (remainingDays <= 90) {
    milestoneCount = Math.max(15, Math.min(30, Math.round(remainingDays * 0.25 + 7)));
  } else {
    milestoneCount = Math.max(30, Math.min(60, Math.round(remainingDays * 0.25 + 7)));
  }

  // Calculate effort hours available per milestone
  const totalHoursAvailable = remainingDays * hoursPerDay;
  const milestoneEffortHours = Math.max(1, Math.round((totalHoursAvailable * 0.6) / milestoneCount));
  const estimatedEffort = milestoneEffortHours === 1 ? "1 hour" : `${milestoneEffortHours} hours`;

  const milestones: any[] = [];

  for (let i = 0; i < milestoneCount; i++) {
    const ratio = milestoneCount > 1 ? i / (milestoneCount - 1) : 0;
    const targetDay = Math.max(1, Math.round(remainingDays * ratio));
    const stepNumber = i + 1;

    let title = "";
    let description = "";
    let successCriteria = "";
    let priority: "low" | "medium" | "high" = "medium";

    // Distribute priority: 25% low, 50% medium, 25% high
    if (ratio > 0.4 && ratio < 0.8) {
      priority = "high";
    } else if (ratio < 0.2) {
      priority = "low";
    }

    switch (goalData.category) {
      case "Study":
      case "Exam": {
        if (ratio <= 0.15) {
          title = `Syllabus analysis and guide collation (Step ${stepNumber})`;
          description = "Review syllabus requirements, establish study parameters, and catalog resources.";
          successCriteria = "Detailed topic breakdown checklist created";
        } else if (ratio <= 0.55) {
          const unitNum = Math.floor((ratio - 0.15) * 10) + 1;
          title = `Unit ${unitNum} content review and study notes (Step ${stepNumber})`;
          description = `Perform reading sessions on Unit ${unitNum} concepts and write chapter summaries.`;
          successCriteria = `Complete notes drafted for Unit ${unitNum}`;
        } else if (ratio <= 0.70) {
          title = `Index card recall and definitions drill (Step ${stepNumber})`;
          description = "Prepare active recall index cards for formulas, key concepts, and vocabulary.";
          successCriteria = "Flashcards database loaded and verified";
        } else if (ratio <= 0.85) {
          title = `Previous-year paper sessions and questions (Step ${stepNumber})`;
          description = "Solve MCQ problem sets and complete previous exam question papers under timed conditions.";
          successCriteria = "Scored above 80% on practice modules";
        } else {
          title = `Final mock exam and weak topic revision (Step ${stepNumber})`;
          description = "Execute a full-length timed mock test and review remaining high-risk topic areas.";
          successCriteria = "Mock exam finished with zero notes assistance";
        }
        break;
      }
      case "Coding": {
        if (ratio <= 0.15) {
          title = `Requirements gathering and spec layout (Step ${stepNumber})`;
          description = "Outline functional requirements, specify APIs payload schemas, and draft user flows.";
          successCriteria = "Functional specification document approved";
        } else if (ratio <= 0.30) {
          title = `Database schema configuration and scripts (Step ${stepNumber})`;
          description = "Design database entities model, map relationships, and write SQL migrations.";
          successCriteria = "Database tables compiled and initialized";
        } else if (ratio <= 0.50) {
          title = `Backend API models and routes setup (Step ${stepNumber})`;
          description = "Write REST endpoints controller logic, data validations, and secure paths.";
          successCriteria = "Backend server successfully handles mockup API tests";
        } else if (ratio <= 0.75) {
          title = `Frontend layout development and pages (Step ${stepNumber})`;
          description = "Code interactive frontend layouts, state integration, and handle server connections.";
          successCriteria = "Frontend pages display reactive datasets correctly";
        } else if (ratio <= 0.90) {
          title = `Validation checkups and automated tests (Step ${stepNumber})`;
          description = "Execute integration tests, resolve lint errors, and check memory leak cases.";
          successCriteria = "Tests suite passes with zero warnings";
        } else {
          title = `Production build staging and deployment (Step ${stepNumber})`;
          description = "Staging build compilation check, DNS domain configuration, and staging/prod release.";
          successCriteria = "Production URL is accessible and loads cleanly";
        }
        break;
      }
      case "Life": {
        if (ratio <= 0.15) {
          title = `Safety drills and respiratory coordination (Step ${stepNumber})`;
          description = "Practice breathing rhythm, floating forms, and safety rules under guidance.";
          successCriteria = "Comfortably float and coordinate breaths";
        } else if (ratio <= 0.35) {
          title = `Kicking drills and core mechanics (Step ${stepNumber})`;
          description = "Leg movement drills, kicking boards practice, and core stabilization routines.";
          successCriteria = "Consistently kick distance laps with board assistance";
        } else if (ratio <= 0.60) {
          title = `Strokes movement and coordination laps (Step ${stepNumber})`;
          description = "Integrate arm stroke motions and coordinate kicks with body roll cycles.";
          successCriteria = "Coordinate continuous arm cycles successfully";
        } else if (ratio <= 0.80) {
          title = `Stamina laps and pacing checks (Step ${stepNumber})`;
          description = "Focus on pacing stamina. Swim continuous half-laps without rest breaks.";
          successCriteria = "Complete pacing runs with minimal fatigue";
        } else {
          title = `Continuous distance benchmark review (Step ${stepNumber})`;
          description = "Perform a timed evaluation of target distance laps under record limits.";
          successCriteria = "Benchmark distance checked and recorded in logs";
        }
        break;
      }
      default: {
        if (ratio <= 0.15) {
          title = `Scope selection and design outlines (Step ${stepNumber})`;
          description = "Define scope criteria, select portfolio projects, and outline case study outlines.";
          successCriteria = "Project selection index compiled";
        } else if (ratio <= 0.30) {
          title = `Wireframe sketches and UI styling sheets (Step ${stepNumber})`;
          description = "Create layout mockups, define visual CSS theme palettes, and setup typography.";
          successCriteria = "UI design styleguide approved";
        } else if (ratio <= 0.65) {
          title = `Implementation drafts and layout coding (Step ${stepNumber})`;
          description = "Code project items showcase sections, experience tables, and detail screens.";
          successCriteria = "Layout templates compile and load mockup details";
        } else if (ratio <= 0.85) {
          title = `Visual content asset creation and uploads (Step ${stepNumber})`;
          description = "Generate mockup assets, write case study text paragraphs, and format screenshots.";
          successCriteria = "All content copy uploaded and aligned";
        } else {
          title = `Staging deployment and bundle tuning (Step ${stepNumber})`;
          description = "Compile production packages, verify responsive scaling on mobile, and deploy staging.";
          successCriteria = "Staging deployment loads in under 1.5 seconds";
        }
        break;
      }
    }

    milestones.push({
      day: targetDay,
      title,
      description,
      estimatedEffort,
      priority,
      successCriteria,
    });
  }

  return milestones;
}

function getLocalPlan(goalData: any) {
  const milestones = generateLocalMilestones(goalData);
  const today = new Date();
  const deadlineDate = new Date(goalData.deadline);
  const remainingDays = Math.max(1, Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  
  let riskLevel = "healthy";
  let probability = 80;
  if (remainingDays <= 3) {
    riskLevel = "critical";
    probability = 45;
  } else if (remainingDays < 7) {
    riskLevel = "at-risk";
    probability = 65;
  }

  const recoverySteps = (riskLevel === "critical" || remainingDays <= 3) ? milestones.map((m, idx) => ({
    stepNumber: idx + 1,
    action: m.title,
    estimatedTime: m.estimatedEffort,
    impact: 15,
    reason: m.description
  })) : [];

  return {
    goal_summary: goalData.description || `Plan targeting completion of: "${goalData.title}".`,
    risk_level: riskLevel,
    completion_probability: probability,
    bottlenecks: (riskLevel === "critical" || remainingDays <= 3) ? [`Schedule constraint: only ${remainingDays} days left.`] : [],
    milestones: milestones,
    next_action: milestones[0]?.title || "Get started",
    recovery_plan: recoverySteps
  };
}

function getLocalMissionCommand(goals: any[]) {
  if (!goals || goals.length === 0) {
    return {
      criticalGoalId: "",
      todayFocus: "",
      goalRanking: [],
      reasoning: [],
      goalScores: []
    };
  }

  // Sort goals by days remaining
  const sorted = [...goals].sort((a, b) => (a.daysRemaining || 99) - (b.daysRemaining || 99));
  const critical = sorted[0];

  const getCategoryReason = (g: any) => {
    const title = g.title || "";
    const titleLower = title.toLowerCase();
    const catLower = (g.category || "").toLowerCase();

    if (catLower.includes("exam") || catLower.includes("study") || titleLower.includes("exam") || titleLower.includes("midterm") || titleLower.includes("prep")) {
      return `Exam "${title}" is approaching in ${g.daysRemaining} days and has high priority.`;
    }
    if (titleLower.includes("piano")) {
      return `Daily practice consistency for "${title}" is required to build muscle memory and skill progression.`;
    }
    if (titleLower.includes("swim")) {
      return `Regular technique practice for "${title}" is required to improve endurance and stroke efficiency.`;
    }
    if (catLower.includes("coding") || catLower.includes("work") || titleLower.includes("portfolio") || titleLower.includes("project")) {
      return `Project "${title}" deadline is approaching and core modules remain unfinished.`;
    }
    if (catLower.includes("habit") || catLower.includes("life") || catLower.includes("skill")) {
      return `Maintaining streak consistency for "${title}" prevents regression and increases long-term success.`;
    }
    return `Maintaining streak consistency for "${title}" prevents regression and increases long-term success.`;
  };

  const goalScores = goals.map(g => {
    let urgency = "medium";
    let score = 50;
    if (g.daysRemaining <= 3 || g.completionProbability < 60) {
      urgency = "critical";
      score = 90;
    } else if (g.daysRemaining < 7) {
      urgency = "high";
      score = 75;
    }
    return {
      goalId: g.id,
      score: score,
      urgency: urgency,
      reason: getCategoryReason(g)
    };
  });

  // Today's focus clean title formatting (Bug #3)
  const formatTitle = (title: string) => {
    if (!title) return "";
    const titleLower = title.toLowerCase();
    if (titleLower.includes("piano")) {
      return "Today's Focus: Piano Skill Development";
    }
    if (titleLower.includes("swim")) {
      return "Today's Focus: Swimming Endurance Training";
    }
    return `Today's Focus: ${title}`;
  };

  const focusText = formatTitle(critical.title);

  return {
    criticalGoalId: critical.id,
    todayFocus: focusText,
    goalRanking: sorted.map(g => g.title),
    reasoning: [
      getCategoryReason(critical),
      "Resolve high-priority milestones to bolster safety probabilities."
    ],
    goalScores: goalScores
  };
}

export async function askJarvisAgent(userQuery: string, goals: any[], selectedGoalId: string | null): Promise<{ speech: string; command?: string; parameter?: string }> {
  const context = goals.map(g => ({
    id: g.id,
    title: g.title,
    daysRemaining: g.daysRemaining,
    completionProbability: g.completionProbability,
    category: g.category,
    pendingMilestone: g.milestones?.find((m: any) => m.status === 'pending')?.title || ""
  }));

  const prompt = `
You are Jarvis, the user's personal AI productivity assistant.
The user says: "${userQuery}"

Active Goals:
${JSON.stringify(context, null, 2)}
Selected Goal ID: ${selectedGoalId || "none"}

Your response must be JSON only. Return ONLY this structure:
{
  "speech": "concise spoken feedback to the user (max 2 sentences, start or end with a respectful 'sir')",
  "command": "optional_command_name",
  "parameter": "optional_parameter"
}

Allowed commands:
- "go_to_dashboard" (user wants dashboard or home)
- "create_goal" (user wants to create a new goal; parameter is the clean goal title)
- "open_goal" (user wants to open or see insights of a goal; parameter is the matching goal title)
- "delete_goal" (user wants to delete a goal; parameter is the matching goal title or 'current')
- "archive_goal" (user wants to archive a goal; parameter is the matching goal title or 'current')
- "complete_milestone" (user completed or wants to complete their current milestone)

If the user is asking a general question, just reply with a helpful answer inside "speech" and omit "command".
`;

  try {
    if (!GEMINI_API_KEY) throw new Error("Gemini API key missing");
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );
    if (!response.ok) throw new Error(`Gemini status ${response.status}`);
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty response");
    return JSON.parse(text.trim());
  } catch (e) {
    try {
      if (!GROQ_API_KEY) throw new Error("Groq API key missing");
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.2
        })
      });
      if (!response.ok) throw new Error(`Groq status ${response.status}`);
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content || "";
      return JSON.parse(text.trim());
    } catch (err) {
      throw new Error("API failed");
    }
  }
}
