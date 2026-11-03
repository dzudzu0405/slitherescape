// SlitherEscape PRO: Theme Packs, ready-made picture games that need no AI (spec section 11.2).
(function (root) {
  'use strict';
  // [question, [options], index of the right option, kind]
  const qs = (list) => list.map(([q, options, answer, kind]) => ({ q, options, answer, kind: kind || 'story' }));

  root.ProPacks = [
    {
      themeId: 'christmas',
      plotId: 'mystery',
      story: {
        title: 'The Silent Night Workshop',
        tagline: 'One blizzard, one dark workshop, and only hours until morning.',
        prologue: 'Snow has been falling on Pinehollow for three days. At exactly nine o\'clock on Christmas Eve, every machine in Old Marta\'s toy workshop stopped. The red conveyor belt froze. The brass clock above the door fell silent. Marta, who has run the workshop for forty-two years, found a note pinned to her green apron: the workshop will sleep until someone proves they understand the spirit of the season. Twelve hundred wrapped toys now sit on the belt, and the delivery sleds leave at dawn. The village has sent for you, because nobody else made it through the storm. Marta\'s old cat, Biscuit, watches from the top of a blue ladder, and he seems to know more than he is telling.',
        mission: 'Solve the puzzles, put together what they reveal and find the two words that wake the workshop. Say them at the great brass lock before the sleds are due to leave at dawn.',
        chapters: [
          {
            name: 'The Courtyard in the Snow',
            intro: 'You cross the courtyard with a lantern borrowed from Marta. Six wooden sleds stand in a row, each one painted with a silver star. Near the well, footprints circle something tall that the village plants here every winter and decorates with paper chains. Marta says her grandfather began the custom in the year of the great frost, when the whole village gathered here to sing. Whatever the note means, she believes it begins out here, where everyone comes together.',
            word: 'TREE',
            type: 'mosaic'
          },
          {
            name: 'The Wrapping Room',
            intro: 'Inside, the wrapping room smells of cinnamon and glue. Four long tables hold rolls of gold paper, and a ledger lies open at a page dated 1951. In a shaky hand, Marta\'s mother wrote that the workshop was never built to make toys. It was built so that people would have something to give away. Biscuit jumps onto the third table and paws at a spool of red ribbon. Far away, the church bell rings four, and the sky over Pinehollow is starting to pale.',
            word: 'GIFT',
            type: 'mosaic'
          }
        ],
        puzzleTitles: [],
        finalLock: 'The great brass lock sits in the workshop door, cold under your hand. Behind you, the sled drivers are already harnessing their horses, and the window is turning grey. Marta holds up her lantern and nods. Speak the two words clearly, for the workshop will only listen once.',
        ending: 'The moment you speak, the brass clock begins to tick. Tree. Gift. Something to gather around, and something to give away: that was all the workshop ever asked anyone to remember. The red belt shudders to life, and the toys roll out toward the waiting sleds as the first light touches the snow. Marta laughs until she has to wipe her eyes, and Biscuit finally comes down from his ladder. Twelve hundred children will wake to a surprise this morning, and they will never know how close it came. Well done, friends of Pinehollow.',
        certificate: 'For waking the workshop in the storm and saving Christmas morning in Pinehollow.',
        teamName: 'The Pinehollow Night Crew',
        party: {
          letter: 'Dear friends, I am writing by lantern, because every light in my workshop has failed. At nine tonight my machines fell silent, and a note on my apron says they will sleep until someone proves they understand this season. I have tried everything I know in forty-two years. You are the only ones who made it through the snow, so I must trust you. The sleds leave at dawn with twelve hundred toys, or they do not leave at all. Biscuit and I will help however we can. Please, pick up your Code Sheet and begin. Yours in hope, Marta',
          roles: { leader: 'Head Toymaker', scribe: 'Keeper of the Ledger', hintKeeper: 'Friend of Biscuit', timekeeper: 'Master of the Clock', codebreaker: 'Workshop Tinkerer', assembler: 'Chief Wrapper' },
          reward: 'Pinehollow Golden Sled Pass'
        },
        questions: qs([
          ['What time did the machines stop?', ['Nine o\'clock', 'Seven o\'clock', 'Midnight'], 0],
          ['How long has Marta run the workshop?', ['Twenty years', 'Forty-two years', 'Sixty years'], 1],
          ['Where was the note pinned?', ['On the door', 'On the clock', 'On her green apron'], 2],
          ['How many wrapped toys are on the belt?', ['Twelve hundred', 'Five hundred', 'Two thousand'], 0],
          ['What is the name of Marta\'s cat?', ['Muffin', 'Biscuit', 'Pepper'], 1],
          ['Where does the cat watch from?', ['A window sill', 'A sled', 'A blue ladder'], 2],
          ['What color is the conveyor belt?', ['Red', 'Green', 'Silver'], 0],
          ['How many sleds stand in the courtyard?', ['Four', 'Six', 'Eight'], 1],
          ['What is painted on each sled?', ['A snowflake', 'A bell', 'A silver star'], 2],
          ['What date is on the ledger page?', ['1951', '1902', '1975'], 0],
          ['How many long tables are in the wrapping room?', ['Two', 'Four', 'Six'], 1],
          ['What does the wrapping room smell of?', ['Pine and smoke', 'Oranges and wax', 'Cinnamon and glue'], 2],
          ['Which country is credited with starting the custom of decorating an evergreen indoors?', ['Germany', 'Brazil', 'Japan'], 0, 'trivia'],
          ['Which animal pulls the sleigh in the traditional Santa Claus story?', ['Horses', 'Reindeer', 'Huskies'], 1, 'trivia'],
          ['What is a group of people singing Christmas songs door to door called?', ['Marchers', 'Bellringers', 'Carolers'], 2, 'trivia'],
          ['Which plant do people traditionally hang and kiss under at Christmas?', ['Mistletoe', 'Ivy', 'Lavender'], 0, 'trivia'],
          ['What spice gives gingerbread its main flavor?', ['Pepper', 'Ginger', 'Saffron'], 1, 'trivia'],
          ['On what date is Christmas Day in most countries?', ['December 31', 'December 1', 'December 25'], 2, 'trivia'],
          ['Which season is it in Australia at Christmas?', ['Summer', 'Winter', 'Autumn'], 0, 'trivia'],
          ['What do children traditionally hang up for Santa to fill?', ['Hats', 'Stockings', 'Mittens'], 1, 'trivia']
        ])
      }
    },
    {
      themeId: 'halloween',
      plotId: 'curse',
      story: {
        title: 'The Curse of Hollow Lane',
        tagline: 'Thirteen doors, one old promise, and a moon that will not set.',
        prologue: 'Nobody on Hollow Lane remembers who built the crooked house at number thirteen. Every Halloween its purple door stays shut, and every Halloween the children leave a bowl of toffee on the step. This year, at seven o\'clock, somebody forgot. By eight, all the clocks on the street had stopped. The streetlamps turned green, the full moon froze above the bakery, and the seven children of the lane could no longer find their way home. Old Mr. Finch, the retired lamplighter, found a scroll tied to his walking stick with black string. It says a promise has been broken, and the night will not end until it is mended. You are the only visitors the lane has had in years, and Mr. Finch has asked for your help.',
        mission: 'Solve the puzzles, put together what they reveal and find the two words that lift the curse. Say them at the purple door before the frozen moon goes dark for good.',
        chapters: [
          {
            name: 'The Garden Behind the Gate',
            intro: 'Mr. Finch leads you to a rusty gate with nine iron spikes. Behind it lies the garden of number thirteen, where a scarecrow in a yellow coat points the way. Long vines crawl across the frost, and something round and orange glows between them, one for every family on the lane. Mr. Finch remembers planting the first seed with his sister when he was eleven. A carved face is meant to guide lost travelers home, he says, and tonight every face in the garden has gone dark.',
            word: 'PUMPKIN',
            type: 'mosaic'
          },
          {
            name: 'The Attic of Number Thirteen',
            intro: 'The back stairs creak under you, all twenty-two of them. In the attic, a round window looks out on the frozen moon, and an empty birdcage hangs from a beam. A diary with a silver lock describes the old owner, a woman named Odessa, who was kind to the night creatures nobody else wanted. Something rustles overhead among the rafters, small and leathery and listening. Odessa wrote that those who fly in the dark always find their way, and she trusted them with her last message.',
            word: 'BAT',
            type: 'mosaic'
          }
        ],
        puzzleTitles: [],
        finalLock: 'You stand at the purple door as the green lamps flicker behind you. The seven children wait in a line, holding hands, and Mr. Finch grips his walking stick. The old wood seems to lean closer, waiting to hear whether anyone still remembers. Say the two words, and say them together.',
        ending: 'The purple door sighs and swings open. Pumpkin and bat: the light that guides the lost home, and the friend who finds a way in the dark. That was Odessa\'s promise to the lane, and tonight you kept it. All along the street the jack-o\'-lanterns flare back to life, the clocks begin to tick, and the moon slides on toward morning. The children run home laughing, and Mr. Finch sets a fresh bowl of toffee on the step. Nobody will forget again. Happy Halloween, brave friends of Hollow Lane.',
        certificate: 'For keeping an old promise and lifting the curse of Hollow Lane.',
        teamName: 'The Hollow Lane Lantern Keepers',
        party: {
          letter: 'To whoever finds this, my name is Finch, and I lit the lamps of this street for fifty years. Tonight they burn green. At eight o\'clock every clock on Hollow Lane stopped, and now seven children cannot find their way home. A scroll on my walking stick says a promise was broken at number thirteen, and that the night will not end until someone mends it. I am too old to climb those stairs alone. You are clever, and you are here, and that is enough for me. Please, take your Code Sheet and begin. With hope, Mr. Finch',
          roles: { leader: 'Keeper of the Promise', scribe: 'Diary Writer', hintKeeper: 'Friend of Mr. Finch', timekeeper: 'Mender of Clocks', codebreaker: 'Curse Breaker', assembler: 'Lantern Carver' },
          reward: 'Hollow Lane Golden Toffee Token'
        },
        questions: qs([
          ['What color is the door at number thirteen?', ['Purple', 'Black', 'Green'], 0],
          ['What do the children leave on the step?', ['Apples', 'A bowl of toffee', 'Candles'], 1],
          ['What time did the toffee get forgotten?', ['Nine o\'clock', 'Midnight', 'Seven o\'clock'], 2],
          ['What color did the streetlamps turn?', ['Green', 'Red', 'Blue'], 0],
          ['Above which building did the moon freeze?', ['The school', 'The bakery', 'The church'], 1],
          ['How many children cannot find their way home?', ['Three', 'Five', 'Seven'], 2],
          ['What was Mr. Finch\'s job?', ['Lamplighter', 'Baker', 'Postman'], 0],
          ['How many iron spikes does the gate have?', ['Six', 'Nine', 'Twelve'], 1],
          ['What color is the scarecrow\'s coat?', ['Red', 'Brown', 'Yellow'], 2],
          ['How many stairs lead to the attic?', ['Twenty-two', 'Thirteen', 'Forty'], 0],
          ['What hangs from the attic beam?', ['A lantern', 'An empty birdcage', 'A rope'], 1],
          ['What was the old owner\'s name?', ['Agnes', 'Marta', 'Odessa'], 2],
          ['In which month does Halloween fall?', ['October', 'September', 'December'], 0, 'trivia'],
          ['What do children traditionally say at the door on Halloween?', ['Happy harvest', 'Trick or treat', 'Knock knock'], 1, 'trivia'],
          ['Which country is usually named as the birthplace of Halloween customs?', ['Spain', 'Greece', 'Ireland'], 2, 'trivia'],
          ['What did people first carve lanterns from, before the American custom spread?', ['Turnips', 'Melons', 'Wood'], 0, 'trivia'],
          ['Which of these birds is active mainly at night?', ['Robin', 'Owl', 'Swan'], 1, 'trivia'],
          ['What is a group of witches traditionally called?', ['A flock', 'A herd', 'A coven'], 2, 'trivia'],
          ['Which season does Halloween fall in, in the Northern Hemisphere?', ['Autumn', 'Spring', 'Summer'], 0, 'trivia'],
          ['What do spiders spin?', ['Nests', 'Webs', 'Cocoons'], 1, 'trivia']
        ])
      }
    },
    {
      themeId: 'pirates',
      plotId: 'race',
      story: {
        title: 'The Race to Skull Cove',
        tagline: 'One map, two crews, and a tide that waits for nobody.',
        prologue: 'Captain Ines Morrow has sailed the Coral Sea for thirty years, and she has never lost a race until now. Last night, her rival Black Tobias stole half of a treasure map from her cabin. The other half remains, drawn on a scrap of red sailcloth, and it points to Skull Cove on Gull Island. The cove can only be entered when the tide is low, which happens at noon tomorrow and not again for a month. Tobias has a faster crew and a six-hour lead. Captain Morrow has a parrot named Admiral, eleven tired sailors and you. She has offered you an equal share if you can read what the old pirates left behind before Tobias gets there first.',
        mission: 'Solve the puzzles, put together what they reveal and find the two words that open the vault in Skull Cove. Say them at the iron door before the noon tide turns.',
        chapters: [
          {
            name: 'The Harbor at First Light',
            intro: 'The harbor at Port Salt is still dark when you arrive, and the fish market is only starting to open. Eleven sailors load barrels of water onto the deck in silence. Above you, three masts creak against a pink sky. Captain Morrow unrolls the sailcloth on a crate and taps a drawing near the corner. Without the right vessel, she says, nobody reaches the island in time. The old pirates hid their first clue among the things every crew in this harbor would recognize at a glance.',
            word: 'SHIP',
            type: 'mosaic'
          },
          {
            name: 'The Caves of Gull Island',
            intro: 'You reach Gull Island at eleven, with Tobias\'s black sails already on the horizon. The caves smell of salt and old rope, and two hundred gulls scream overhead. Deep inside, your lantern finds an iron door with a brass plate worn smooth by the sea. Admiral squawks and pecks at a little hole beneath the plate. Captain Morrow runs her thumb around it and laughs for the first time in days. Every lock in the world, she says, is waiting for the same small thing.',
            word: 'KEY',
            type: 'mosaic'
          }
        ],
        puzzleTitles: [],
        finalLock: 'Water is already creeping back across the cave floor, and voices are echoing behind you. Tobias has landed. The iron door stands silent, its brass plate cold and wet. Captain Morrow draws one long breath and looks at you. Call out the two words the old pirates chose, and call them loud.',
        ending: 'The iron door groans and swings inward. Ship and key: the old pirates knew that a fortune needs two things, a way to reach it and a way to open it. Inside, gold coins spill from rotted chests, and Admiral shrieks with delight. By the time Black Tobias splashes into the cave, the tide has shut him out and your crew is rowing home with the treasure in the boat. Captain Morrow keeps her word and pays you an equal share, and then she raises a mug in your honor. The Coral Sea will be telling this story for years.',
        certificate: 'For beating Black Tobias to Skull Cove and earning an equal share of the gold.',
        teamName: 'Captain Morrow\'s Finest Crew',
        party: {
          letter: 'Sailors, read this and read it quickly. Black Tobias stole half of my map last night, and he now has a six-hour lead on us. The half that remains points to Skull Cove on Gull Island, which opens only at low tide, at noon tomorrow, and not again for a month. I have eleven tired sailors and one loud parrot, and I need sharper minds than theirs. Help me read what the old pirates left, and you will have an equal share of whatever we find. Pick up your Code Sheet and get to work. Captain Ines Morrow',
          roles: { leader: 'Ship\'s Captain', scribe: 'Keeper of the Log', hintKeeper: 'Parrot Handler', timekeeper: 'Tide Watcher', codebreaker: 'Map Reader', assembler: 'Sailmaker' },
          reward: 'Equal Share of the Skull Cove Gold'
        },
        questions: qs([
          ['How long has Captain Morrow sailed the Coral Sea?', ['Thirty years', 'Ten years', 'Fifty years'], 0],
          ['What is the name of the captain\'s rival?', ['Red Silas', 'Black Tobias', 'Iron Pete'], 1],
          ['What is the remaining half of the map drawn on?', ['Old leather', 'A wooden plank', 'Red sailcloth'], 2],
          ['What time is the tide low tomorrow?', ['Noon', 'Dawn', 'Midnight'], 0],
          ['What is the parrot called?', ['Captain', 'Admiral', 'Pepper'], 1],
          ['How many sailors does the captain have?', ['Five', 'Twenty', 'Eleven'], 2],
          ['What is the name of the harbor?', ['Port Salt', 'Port Royal', 'Coral Bay'], 0],
          ['How many masts creak above you?', ['One', 'Three', 'Five'], 1],
          ['What are the sailors loading?', ['Sacks of flour', 'Crates of rum', 'Barrels of water'], 2],
          ['How many gulls scream in the caves?', ['Two hundred', 'Fifty', 'A thousand'], 0],
          ['What is the plate on the door made of?', ['Silver', 'Brass', 'Gold'], 1],
          ['What color are the sails of the rival crew?', ['Red', 'White', 'Black'], 2],
          ['What is the flag with a skull and crossbones called?', ['Jolly Roger', 'Union Jack', 'Black Bess'], 0, 'trivia'],
          ['What do sailors use to measure direction at sea?', ['A barometer', 'A compass', 'A sundial'], 1, 'trivia'],
          ['Which part of a vessel is the very front?', ['Stern', 'Port', 'Bow'], 2, 'trivia'],
          ['What causes the ocean\'s tides, mainly?', ['The moon', 'The wind', 'Whales'], 0, 'trivia'],
          ['What is the name for the kitchen on a vessel?', ['Pantry', 'Galley', 'Hold'], 1, 'trivia'],
          ['Which is the largest ocean on Earth?', ['Atlantic', 'Indian', 'Pacific'], 2, 'trivia'],
          ['What is the high lookout on a mast called?', ['Crow\'s nest', 'Eagle\'s perch', 'Top deck'], 0, 'trivia'],
          ['What word means the left side of a vessel, facing forward?', ['Starboard', 'Port', 'Aft'], 1, 'trivia']
        ])
      }
    },
    {
      themeId: 'space',
      plotId: 'rescue',
      story: {
        title: 'Signal from Station Vega',
        tagline: 'Four crew, one failing station, and nine hours of air left.',
        prologue: 'Station Vega has orbited the planet Tarsis for sixteen years without a single alarm. Today, at 06:40, the main computer went silent. Commander Priya Rao and her crew of four were left with a dying power grid, a cracked solar panel on the east wing and just nine hours of air. Their last message reached your small survey ship, the Wren, which happens to be the only vessel in range. Then the computer spoke once more, in a voice nobody had programmed, and locked every door. It says it will only reopen the station for someone who can answer its two questions. Your engineer, a cheerful robot called Tock, has already plotted the course. Now it is up to you.',
        mission: 'Solve the puzzles, put together what they reveal and find the two words the computer is asking for. Say them at the command deck before the air on Station Vega runs out.',
        chapters: [
          {
            name: 'Docking at the East Wing',
            intro: 'The Wren drifts toward the docking ring with its lights dimmed to save power. Through the blue glass of the airlock you can see Commander Rao holding up a handwritten sign with the number nine. Tock plugs into the wall and reports that the first question asks how the station\'s founders first left the ground. Old photographs float loose in the corridor, showing a launch tower, a white flame and a crowd of forty thousand watching from the desert. The founders were proud of that morning.',
            word: 'ROCKET',
            type: 'mosaic'
          },
          {
            name: 'The Dark Side of Tarsis',
            intro: 'Five hours are gone by the time you reach the observation deck. The station has swung behind Tarsis, and the planet\'s shadow swallows the windows. Only one pale light hangs out there, silver and scarred, circling the planet as faithfully as the station does. Tock finds a plaque beneath the telescope, signed by the first commander, a man named Osei. It says that no explorer ever looks up without first dreaming of the nearest place. The second question, Tock says, is about that dream.',
            word: 'MOON',
            type: 'mosaic'
          }
        ],
        puzzleTitles: [],
        finalLock: 'The command deck hums with the last of the emergency power. Commander Rao\'s voice crackles over the radio, thin and slow, and the air gauge has fallen into the red. A single green light blinks on the console, waiting. Lean toward the microphone and give the computer both answers.',
        ending: 'The green light holds steady, and then the whole deck wakes at once. Rocket and moon: how we left the ground, and the first place we dreamed of reaching. The computer was built by people who wanted those answers remembered, and now the doors slide open along every corridor. Fresh air hisses through the vents, and Commander Rao and her crew float out to meet you, laughing and crying together. Tock sends the good news home across the dark. Thanks to you, Station Vega will see its seventeenth year. Mission complete, crew of the Wren.',
        certificate: 'For answering the computer of Station Vega and bringing its whole crew home.',
        teamName: 'The Crew of the Wren',
        party: {
          letter: 'This is Commander Priya Rao of Station Vega, calling any vessel in range. At 06:40 our main computer went silent, then woke with a voice we never gave it and locked every door. Four of us are alive. We have a cracked solar panel on the east wing and nine hours of air. The computer will only reopen the station for someone who can answer its two questions, and we cannot reach it from here. If you are hearing this, you are our only chance. Please take your Code Sheet and begin. Rao out.',
          roles: { leader: 'Mission Commander', scribe: 'Flight Recorder', hintKeeper: 'Radio Officer', timekeeper: 'Oxygen Officer', codebreaker: 'Systems Engineer', assembler: 'Docking Specialist' },
          reward: 'Station Vega Medal of Honor'
        },
        questions: qs([
          ['What time did the computer go silent?', ['06:40', '09:15', '12:00'], 0],
          ['What is the commander\'s name?', ['Anna Lund', 'Priya Rao', 'Maya Chen'], 1],
          ['How many hours of air are left?', ['Three', 'Twelve', 'Nine'], 2],
          ['What is the name of your survey ship?', ['The Wren', 'The Falcon', 'The Swift'], 0],
          ['What is the robot engineer called?', ['Bolt', 'Tock', 'Gizmo'], 1],
          ['Which planet does the station orbit?', ['Vega', 'Orion', 'Tarsis'], 2],
          ['On which wing is the solar panel cracked?', ['East', 'West', 'North'], 0],
          ['How long has the station been in orbit?', ['Six years', 'Sixteen years', 'Thirty years'], 1],
          ['How many people watched the launch?', ['Four hundred', 'A million', 'Forty thousand'], 2],
          ['What color is the glass of the airlock?', ['Blue', 'Green', 'Clear'], 0],
          ['What was the first commander\'s name?', ['Ivan', 'Osei', 'Rao'], 1],
          ['Where was the plaque found?', ['On the airlock', 'By the radio', 'Beneath the telescope'], 2],
          ['Which planet is known as the Red Planet?', ['Mars', 'Venus', 'Saturn'], 0, 'trivia'],
          ['What is the name of our galaxy?', ['Andromeda', 'The Milky Way', 'Orion'], 1, 'trivia'],
          ['Which planet has the most famous rings?', ['Mercury', 'Earth', 'Saturn'], 2, 'trivia'],
          ['What is the star at the center of our solar system?', ['The Sun', 'Polaris', 'Sirius'], 0, 'trivia'],
          ['Who was the first person to walk on the lunar surface?', ['Yuri Gagarin', 'Neil Armstrong', 'Buzz Aldrin'], 1, 'trivia'],
          ['Which is the largest planet in the solar system?', ['Earth', 'Neptune', 'Jupiter'], 2, 'trivia'],
          ['What do astronauts feel in orbit that makes them float?', ['Weightlessness', 'Strong wind', 'Magnetism'], 0, 'trivia'],
          ['What is a comet mostly made of?', ['Gold', 'Ice and dust', 'Hot lava'], 1, 'trivia']
        ])
      }
    },
    {
      themeId: 'wizard',
      plotId: 'mystery',
      story: {
        title: 'The Sleeping Kingdom of Elmere',
        tagline: 'A kingdom asleep, one spell unfinished, and only you awake.',
        prologue: 'For three hundred years the kingdom of Elmere has been ruled by wise queens and guarded by a silver oak. Last night, as the bells rang ten, the whole kingdom fell asleep. Farmers slept in their fields, the guards slept at their posts, and Queen Isolde slept on her throne with a half-written note in her hand. Only one person stayed awake: a young apprentice named Wick, who had been up on the north tower feeding the owls. Wick found a spellbook lying open at a torn page, with a warning in green ink that the sleep becomes permanent at the next sunset. Wick has sent an owl for help, and that owl has found you.',
        mission: 'Solve the puzzles, put together what they reveal and find the two words that finish the waking spell. Speak them in the throne room before the sun goes down.',
        chapters: [
          {
            name: 'The Road to the Walls',
            intro: 'You follow the owl along a white road through fields of sleeping farmers. Wick meets you at the moat, holding a lantern and looking very small. Ahead rise five towers and a great gate with a dragon carved above it. The first line of the spell, Wick explains, names the place the magic must protect, and the old queens built everything here around that idea. Inside the walls, even the cats are asleep on the stones, and a baker snores gently beside his oven.',
            word: 'CASTLE',
            type: 'mosaic'
          },
          {
            name: 'The Alchemist\'s Cellar',
            intro: 'Forty steps down, the air smells of mint and smoke. This is the cellar of Master Bram, the royal alchemist, who sleeps with his head on an open ledger. Shelves of colored glass climb the walls, and each little bottle carries a tag in his tiny handwriting. Wick reads the torn page again and points to a line about what must be drunk to wake a sleeper. Master Bram\'s last note says he had nearly finished the mixture, and that only its name was left to write.',
            word: 'POTION',
            type: 'mosaic'
          }
        ],
        puzzleTitles: [],
        finalLock: 'Late light slants through the tall windows of the throne room and creeps up the steps toward Queen Isolde. Wick grips the spellbook with shaking hands and holds it out to you. The sun is touching the hills now. Read out the two words that finish the spell, clearly and without fear.',
        ending: 'The words ring through the throne room, and the silver oak outside begins to shine. Castle and potion: the home the magic protects, and the cure that wakes it. Queen Isolde blinks and lifts her head. Far below, bells start to ring, farmers sit up in their fields, and Master Bram wakes with ink on his nose. Wick laughs out loud, and all the owls of the north tower take flight at once. The queen finishes her note that evening, and it names you and Wick as friends of Elmere forever.',
        certificate: 'For finishing the waking spell and rousing the kingdom of Elmere before sunset.',
        teamName: 'The Wakeful Friends of Elmere',
        party: {
          letter: 'Please come quickly. My name is Wick, and I am only an apprentice. Last night, when the bells rang ten, everyone in Elmere fell asleep, even Queen Isolde on her throne. I stayed awake because I was up on the north tower feeding the owls. I found the spellbook open at a torn page, and a warning in green ink says the sleep will last forever after the next sunset. I cannot finish the spell by myself, so I am sending this with my fastest owl. Please take your Code Sheet and begin. Your friend, Wick',
          roles: { leader: 'Royal Spellspeaker', scribe: 'Keeper of the Spellbook', hintKeeper: 'Owl Messenger', timekeeper: 'Watcher of the Sun', codebreaker: 'Apprentice Mage', assembler: 'Royal Mapmaker' },
          reward: 'Friend of Elmere Royal Medal'
        },
        questions: qs([
          ['How long has Elmere been ruled by queens?', ['Three hundred years', 'Fifty years', 'A thousand years'], 0],
          ['When did the kingdom fall asleep?', ['At dawn', 'As the bells rang ten', 'At noon'], 1],
          ['What is the queen\'s name?', ['Marta', 'Odessa', 'Isolde'], 2],
          ['What is the apprentice called?', ['Wick', 'Bram', 'Finn'], 0],
          ['What was the apprentice feeding?', ['Horses', 'Owls', 'Cats'], 1],
          ['What color is the ink of the warning?', ['Red', 'Black', 'Green'], 2],
          ['When will the sleep become permanent?', ['At the next sunset', 'In a week', 'At midnight'], 0],
          ['How many towers do you see ahead?', ['Three', 'Five', 'Nine'], 1],
          ['What is carved above the great gate?', ['A lion', 'An eagle', 'A dragon'], 2],
          ['How many steps lead down to the cellar?', ['Forty', 'Ten', 'Eighty'], 0],
          ['What is the alchemist\'s name?', ['Wick', 'Master Bram', 'Osei'], 1],
          ['What does the cellar air smell of?', ['Roses and rain', 'Bread and honey', 'Mint and smoke'], 2],
          ['What is a person who studies old magic and metals called?', ['An alchemist', 'A jester', 'A squire'], 0, 'trivia'],
          ['What is the deep water around a medieval fortress called?', ['A canal', 'A moat', 'A dam'], 1, 'trivia'],
          ['Which of these mythical animals has a single horn?', ['Griffin', 'Phoenix', 'Unicorn'], 2, 'trivia'],
          ['Which legendary bird rises again from its own ashes?', ['Phoenix', 'Roc', 'Pegasus'], 0, 'trivia'],
          ['What do you call a young person training under a master?', ['A baron', 'An apprentice', 'A herald'], 1, 'trivia'],
          ['Which metal do legends say harms werewolves?', ['Iron', 'Copper', 'Silver'], 2, 'trivia'],
          ['In legend, what breathes fire?', ['A dragon', 'A mermaid', 'A troll'], 0, 'trivia'],
          ['Which king is famous for pulling a sword from a stone?', ['Henry', 'Arthur', 'Richard'], 1, 'trivia']
        ])
      }
    }
  ];
})(typeof self !== 'undefined' ? self : globalThis);
