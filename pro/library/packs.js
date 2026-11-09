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
        mission: 'Solve the puzzles, put together what they reveal and find the one word that wakes the workshop. Say it at the great brass lock before the sleds are due to leave at dawn.',
        chapters: [
          {
            name: 'The Courtyard in the Snow',
            intro: 'You cross the courtyard with a lantern borrowed from Marta. Six wooden sleds stand in a row, each one painted with a silver star. Near the well, footprints circle something tall that the village plants here every winter and decorates with paper chains. Marta says her grandfather began the custom in the year of the great frost, when the whole village gathered here to sing. Whatever the note means, she believes it begins out here, where everyone comes together.',
            word: 'TREE',
            type: 'mosaic'
          }
        ],
        puzzleTitles: [],
        finalLock: 'The great brass lock sits in the workshop door, cold under your hand. Behind you, the sled drivers are already harnessing their horses, and the window is turning grey. Marta holds up her lantern and nods. Speak the word clearly, for the workshop will only listen once.',
        ending: 'The moment you speak, the brass clock begins to tick. Tree. Something the whole village gathers around, to sing and to share: that was all the workshop ever asked anyone to remember. The red belt shudders to life, and the toys roll out toward the waiting sleds as the first light touches the snow. Marta laughs until she has to wipe her eyes, and Biscuit finally comes down from his ladder. Twelve hundred children will wake to a surprise this morning, and they will never know how close it came. Well done, friends of Pinehollow.',
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
          ['How many days has snow been falling on Pinehollow?', ['Three', 'Seven', 'Ten'], 0],
          ['When do the delivery sleds leave?', ['At midnight', 'At dawn', 'At noon'], 1],
          ['Who began the custom in the courtyard?', ['Marta\'s mother', 'The mayor', 'Marta\'s grandfather'], 2],
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
        mission: 'Solve the puzzles, put together what they reveal and find the one word that lifts the curse. Say it at the purple door before the frozen moon goes dark for good.',
        chapters: [
          {
            name: 'The Garden Behind the Gate',
            intro: 'Mr. Finch leads you to a rusty gate with nine iron spikes. Behind it lies the garden of number thirteen, where a scarecrow in a yellow coat points the way. Long vines crawl across the frost, and something round and orange glows between them, one for every family on the lane. Mr. Finch remembers planting the first seed with his sister when he was eleven. A carved face is meant to guide lost travelers home, he says, and tonight every face in the garden has gone dark.',
            word: 'PUMPKIN',
            type: 'mosaic'
          }
        ],
        puzzleTitles: [],
        finalLock: 'You stand at the purple door as the green lamps flicker behind you. The seven children wait in a line, holding hands, and Mr. Finch grips his walking stick. The old wood seems to lean closer, waiting to hear whether anyone still remembers. Say the word, and say it together.',
        ending: 'The purple door sighs and swings open. Pumpkin: the glowing face that guides the lost home, one for every family. That was the old promise to the lane, and tonight you kept it. All along the street the jack-o\'-lanterns flare back to life, the clocks begin to tick, and the moon slides on toward morning. The children run home laughing, and Mr. Finch sets a fresh bowl of toffee on the step. Nobody will forget again. Happy Halloween, brave friends of Hollow Lane.',
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
          ['What was the scroll tied with?', ['Black string', 'Red ribbon', 'A silver chain'], 0],
          ['How old was Mr. Finch when he planted the first seed?', ['Seven', 'Eleven', 'Fifteen'], 1],
          ['By what time had all the clocks stopped?', ['Six', 'Midnight', 'Eight'], 2],
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
        mission: 'Solve the puzzles, put together what they reveal and find the one word that opens the vault in Skull Cove. Say it at the iron door before the noon tide turns.',
        chapters: [
          {
            name: 'The Caves of Gull Island',
            intro: 'You reach Gull Island at eleven, with Tobias\'s black sails already on the horizon. The caves smell of salt and old rope, and two hundred gulls scream overhead. Deep inside, your lantern finds an iron door with a brass plate worn smooth by the sea. Admiral squawks and pecks at a little hole beneath the plate. Captain Morrow runs her thumb around it and laughs for the first time in days. Every lock in the world, she says, is waiting for the same small thing.',
            word: 'KEY',
            type: 'mosaic'
          }
        ],
        puzzleTitles: [],
        finalLock: 'Water is already creeping back across the cave floor, and voices are echoing behind you. Tobias has landed. The iron door stands silent, its brass plate cold and wet. Captain Morrow draws one long breath and looks at you. Call out the word the old pirates chose, and call it loud.',
        ending: 'The iron door groans and swings inward. Key: the old pirates knew that every lock is waiting for the same small thing, and that a fortune is no use to anyone who cannot open it. Inside, gold coins spill from rotted chests, and Admiral shrieks with delight. By the time Black Tobias splashes into the cave, the tide has shut him out and your crew is rowing home with the treasure in the boat. Captain Morrow keeps her word and pays you an equal share, and then she raises a mug in your honor. The Coral Sea will be telling this story for years.',
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
          ['How big a lead does Tobias have?', ['Six hours', 'One day', 'Two hours'], 0],
          ['On which island is Skull Cove?', ['Parrot Island', 'Gull Island', 'Shark Island'], 1],
          ['What do the caves smell of?', ['Fish and tar', 'Smoke and rum', 'Salt and old rope'], 2],
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
        prologue: 'Station Vega has orbited the planet Tarsis for sixteen years without a single alarm. Today, at 06:40, the main computer went silent. Commander Priya Rao and her crew of four were left with a dying power grid, a cracked solar panel on the east wing and just nine hours of air. Their last message reached your small survey ship, the Wren, which happens to be the only vessel in range. Then the computer spoke once more, in a voice nobody had programmed, and locked every door. It says it will only reopen the station for someone who can answer its one question. Your engineer, a cheerful robot called Tock, has already plotted the course. Now it is up to you.',
        mission: 'Solve the puzzles, put together what they reveal and find the one word the computer is asking for. Say it at the command deck before the air on Station Vega runs out.',
        chapters: [
          {
            name: 'Docking at the East Wing',
            intro: 'The Wren drifts toward the docking ring with its lights dimmed to save power. Through the blue glass of the airlock you can see Commander Rao holding up a handwritten sign with the number nine. Tock plugs into the wall and reports that the question asks how the station\'s founders first left the ground. Old photographs float loose in the corridor, showing a launch tower, a white flame and a crowd of forty thousand watching from the desert. The founders were proud of that morning.',
            word: 'ROCKET',
            type: 'mosaic'
          }
        ],
        puzzleTitles: [],
        finalLock: 'The command deck hums with the last of the emergency power. Commander Rao\'s voice crackles over the radio, thin and slow, and the air gauge has fallen into the red. A single green light blinks on the console, waiting. Lean toward the microphone and give the computer its answer.',
        ending: 'The green light holds steady, and then the whole deck wakes at once. Rocket: how the founders first left the ground, on a morning they never forgot. The computer was built by people who wanted those answers remembered, and now the doors slide open along every corridor. Fresh air hisses through the vents, and Commander Rao and her crew float out to meet you, laughing and crying together. Tock sends the good news home across the dark. Thanks to you, Station Vega will see its seventeenth year. Mission complete, crew of the Wren.',
        certificate: 'For answering the computer of Station Vega and bringing its whole crew home.',
        teamName: 'The Crew of the Wren',
        party: {
          letter: 'This is Commander Priya Rao of Station Vega, calling any vessel in range. At 06:40 our main computer went silent, then woke with a voice we never gave it and locked every door. Four of us are alive. We have a cracked solar panel on the east wing and nine hours of air. The computer will only reopen the station for someone who can answer its one question, and we cannot reach it from here. If you are hearing this, you are our only chance. Please take your Code Sheet and begin. Rao out.',
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
          ['How many crew members are with Commander Rao?', ['Two', 'Four', 'Six'], 1],
          ['What color is the flame in the old photographs?', ['Orange', 'Blue', 'White'], 2],
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
        mission: 'Solve the puzzles, put together what they reveal and find the one word that finishes the waking spell. Speak it in the throne room before the sun goes down.',
        chapters: [
          {
            name: 'The Road to the Walls',
            intro: 'You follow the owl along a white road through fields of sleeping farmers. Wick meets you at the moat, holding a lantern and looking very small. Ahead rise five towers and a great gate with a dragon carved above it. The first line of the spell, Wick explains, names the place the magic must protect, and the old queens built everything here around that idea. Inside the walls, even the cats are asleep on the stones, and a baker snores gently beside his oven.',
            word: 'CASTLE',
            type: 'mosaic'
          }
        ],
        puzzleTitles: [],
        finalLock: 'Late light slants through the tall windows of the throne room and creeps up the steps toward Queen Isolde. Wick grips the spellbook with shaking hands and holds it out to you. The sun is touching the hills now. Read out the word that finishes the spell, clearly and without fear.',
        ending: 'The words ring through the throne room, and the silver oak outside begins to shine. Castle: the home the old magic was made to protect, and the word that wakes it. Queen Isolde blinks and lifts her head. Far below, bells start to ring, farmers sit up in their fields, and the baker wakes with flour on his nose. Wick laughs out loud, and all the owls of the north tower take flight at once. The queen finishes her note that evening, and it names you and Wick as friends of Elmere forever.',
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
          ['What guards the kingdom of Elmere?', ['A silver oak', 'A stone giant', 'A golden eagle'], 0],
          ['Where does Wick meet you?', ['At the gate', 'At the moat', 'In the tower'], 1],
          ['Who snores beside his oven?', ['A guard', 'A farmer', 'A baker'], 2],
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
    ,{
      themeId: 'valentine',
      plotId: 'mystery',
      story: {
        title: 'The Lost Note of Larkspur Lane',
        tagline: 'A sweet shop, a secret admirer, and a promise fifty years old.',
        prologue: 'Every February, the Sweet Spoon chocolate shop on Larkspur Lane fills its window with pink boxes and paper doves. This year, at noon on the thirteenth, its owner Delphine found something strange behind the old brass till: half of a love note, written in violet ink and dated fifty years ago. It was signed only with the initial T. Delphine has been a widow for nine years, but she knows that handwriting, and she wants to know how the story ended. The other half is hidden somewhere in the building, and the shop will be sold to a stranger on the fifteenth. Her grandson Milo has offered you free truffles for life if you can find it in time.',
        mission: 'Solve the puzzles, put together what they reveal and find the one word that completes the old note. Say it to Delphine before the shop is sold on the fifteenth.',
        chapters: [
          {
            name: 'The Window Display',
            intro: 'You begin in the front window, among seven tiers of pink boxes and a paper dove on a silver thread. Milo says his grandmother never let anyone change one thing in this corner, not even the faded red ribbon around the third shelf. Tucked beneath the shelf is a postcard from Paris, showing a bridge at sunset. On the back, someone has drawn a small shape and written that it is the only thing worth giving away and the only thing you cannot buy here.',
            word: 'HEART',
            type: 'mosaic'
          }
        ],
        puzzleTitles: [],
        finalLock: 'Back in the shop, Delphine sits by the till with the torn page in her lap, and Milo holds his breath behind the counter. Outside, the bell above the door gives a tiny ring in the draft. She looks up and waits. Tell her the word that finishes what was written so long ago.',
        ending: 'Delphine reads the word aloud and begins to cry and laugh at once. Heart: the note ends with a promise to give his, every year, for as long as they lived. And so he did, for forty-one years, and she had never known where it started. The other half falls from the lining of the till when Milo lifts it, and it matches perfectly. Delphine tears up the offer to sell the shop right there. The Sweet Spoon will stay open, Milo will learn the recipes, and you will never pay for a truffle again. Happy Valentine\'s Day, dear friends.',
        certificate: 'For finding a fifty-year-old promise and saving the Sweet Spoon on Larkspur Lane.',
        teamName: 'The Larkspur Lane Sweethearts',
        party: {
          letter: 'Dear friends, my name is Delphine, and I have run the Sweet Spoon for most of my life. Today I found half of a love note behind my till, written in violet ink fifty years ago. I believe I know whose hand it is, and I need to know how it ends. My shop is to be sold on the fifteenth, so there is very little time. My grandson Milo says you are clever and kind, and he has promised you truffles for life. Please, take up your Code Sheet and begin. With all my love, Delphine',
          roles: { leader: 'Keeper of the Promise', scribe: 'Writer of Love Notes', hintKeeper: 'Friend of Milo', timekeeper: 'Watcher of the Till', codebreaker: 'Chocolate Taster', assembler: 'Ribbon Tier' },
          reward: 'Sweet Spoon Truffles for Life Pass'
        },
        questions: qs([
          ['What is the name of the chocolate shop?', ['The Sweet Spoon', 'The Sugar Bell', 'The Cocoa Door'], 0],
          ['What color ink was the note written in?', ['Blue', 'Violet', 'Green'], 1],
          ['Where was the note found?', ['Under a shelf', 'In a box', 'Behind the till'], 2],
          ['How old is the note?', ['Fifty years', 'Ten years', 'Ninety years'], 0],
          ['What initial was the note signed with?', ['M', 'T', 'D'], 1],
          ['Who is Milo?', ['Her neighbor', 'Her son', 'Her grandson'], 2],
          ['How many tiers of boxes are in the window?', ['Seven', 'Three', 'Twelve'], 0],
          ['Which city is on the postcard?', ['Rome', 'Paris', 'Vienna'], 1],
          ['What does the postcard show?', ['A tower at night', 'A river boat', 'A bridge at sunset'], 2],
          ['How long has Delphine been a widow?', ['Nine years', 'Two years', 'Twenty years'], 0],
          ['What color is the ribbon around the third shelf?', ['Gold', 'Faded red', 'Pale blue'], 1],
          ['On what date will the shop be sold?', ['The thirteenth', 'The twentieth', 'The fifteenth'], 2],
          ['On what date is Valentine\'s Day?', ['February 14', 'March 14', 'January 14'], 0, 'trivia'],
          ['Chocolate is made from the seeds of which plant?', ['Coffee', 'Cacao', 'Vanilla'], 1, 'trivia'],
          ['Which winged figure is linked with love in Roman myth?', ['Mercury', 'Mars', 'Cupid'], 2, 'trivia'],
          ['Which bird is a traditional symbol of peace and love?', ['Dove', 'Crow', 'Hawk'], 0, 'trivia'],
          ['What is a long, soft sweet with chocolate on the outside and cream inside often called?', ['A biscuit', 'A truffle', 'A wafer'], 1, 'trivia'],
          ['Which season is it in February in Canada?', ['Summer', 'Autumn', 'Winter'], 2, 'trivia'],
          ['What is the French word for "thank you"?', ['Merci', 'Bonjour', 'Salut'], 0, 'trivia'],
          ['What do people commonly send to loved ones on this day?', ['Tax forms', 'Cards', 'Maps'], 1, 'trivia']
        ])
      }
    },
    {
      themeId: 'easter',
      plotId: 'race',
      story: {
        title: 'The Great Meadow Morning Hunt',
        tagline: 'Twenty hidden treasures, one muddy meadow, and a rival team on the move.',
        prologue: 'Every spring since 1931, the village of Willowby has held the Great Meadow Morning Hunt. This year the prize is the Golden Basket, a trophy no team from your side of the river has won in twenty-six years. The rules are read at eight by old Mrs. Applegate, who wears a yellow hat and carries a silver whistle. At the sound of the whistle, teams race across the meadow to follow her clues. Your great rivals, the Hillside Hares, have already been spotted with a pair of binoculars and a very suspicious wheelbarrow. The hunt ends at ten sharp, when the church clock strikes. You have two hours, four muddy fields and one chance.',
        mission: 'Solve the puzzles, put together what they reveal and find the one word that claims the Golden Basket. Shout it to Mrs. Applegate before the clock strikes ten.',
        chapters: [
          {
            name: 'The Lower Field',
            intro: 'The whistle blows, and you splash through the lower field in your boots. Five straw bales mark the way to a red gate, where a small sign reads Begin With Beginnings. Mrs. Applegate has always said that every spring starts from something small and quiet that holds new life inside. A blue ribbon flutters from the fence post beside a nest of hay. Across the field, the Hillside Hares are pushing their wheelbarrow through the mud, and they are not far behind you.',
            word: 'EGG',
            type: 'mosaic'
          }
        ],
        puzzleTitles: [],
        finalLock: 'You burst into the village square with mud to your knees. Mrs. Applegate stands by the fountain with her silver whistle, and the Golden Basket glitters on the table beside her. Behind you, a wheelbarrow rattles closer. High above, the great clock begins to whir. Shout the word now!',
        ending: 'Mrs. Applegate raises her hand and the whole square falls silent. Egg: the small, quiet beginning of every spring. It is correct! The clock strikes ten as she places the Golden Basket in your arms, and the crowd roars. The Hillside Hares arrive a moment later, wheelbarrow and all, and they are good enough to clap. For the first time in twenty-six years, the trophy is crossing the river. There will be hot cross buns for everyone. Happy Easter, champions of Willowby.',
        certificate: 'For winning the Golden Basket at the Great Meadow Morning Hunt in Willowby.',
        teamName: 'The Riverside Runners',
        party: {
          letter: 'Dear hunters, this is Mrs. Applegate writing to welcome you to the Great Meadow Morning Hunt. Our village has held it each spring since 1931, and this year the Golden Basket is yours to win. Your side of the river has not won in twenty-six years, and the Hillside Hares are very confident indeed. I shall blow my silver whistle at eight, and the hunt ends when the church clock strikes ten. Wear your boots, for the fields are muddy. Now pick up your Code Sheet and be ready. Good luck, Mrs. Applegate',
          roles: { leader: 'Team Captain', scribe: 'Clue Keeper', hintKeeper: 'Friend of Mrs. Applegate', timekeeper: 'Watcher of the Clock', codebreaker: 'Meadow Scout', assembler: 'Basket Weaver' },
          reward: 'Golden Basket Champion Medal'
        },
        questions: qs([
          ['Since what year has the hunt been held?', ['1931', '1901', '1975'], 0],
          ['What is the prize called?', ['The Silver Cup', 'The Golden Basket', 'The Spring Crown'], 1],
          ['How many years since your side last won?', ['Six', 'Ten', 'Twenty-six'], 2],
          ['What does Mrs. Applegate carry?', ['A silver whistle', 'A brass bell', 'A wooden stick'], 0],
          ['What color is her hat?', ['Blue', 'Yellow', 'Green'], 1],
          ['What are the rival team called?', ['The Meadow Foxes', 'The Valley Ducks', 'The Hillside Hares'], 2],
          ['What are the rivals pushing?', ['A wheelbarrow', 'A cart', 'A sled'], 0],
          ['What time does the hunt end?', ['Nine', 'Ten', 'Noon'], 1],
          ['How many straw bales mark the way?', ['Two', 'Eight', 'Five'], 2],
          ['What color is the gate in the lower field?', ['Red', 'White', 'Black'], 0],
          ['What flutters from the fence post?', ['A yellow flag', 'A blue ribbon', 'A paper kite'], 1],
          ['At what time are the rules read?', ['Nine', 'Seven', 'Eight'], 2],
          ['In which season is Easter in Europe?', ['Spring', 'Summer', 'Winter'], 0, 'trivia'],
          ['What spiced treats are traditionally eaten around this holiday?', ['Pumpkin pies', 'Hot cross buns', 'Candy canes'], 1, 'trivia'],
          ['Which yellow spring flower is often linked with Easter?', ['Sunflower', 'Poppy', 'Daffodil'], 2, 'trivia'],
          ['What is a baby sheep called?', ['A lamb', 'A kid', 'A calf'], 0, 'trivia'],
          ['What do chickens hatch from?', ['Seeds', 'Shells', 'Cocoons'], 1, 'trivia'],
          ['What do you call a group of baby birds in one nest?', ['A herd', 'A pack', 'A clutch'], 2, 'trivia'],
          ['What do bees collect from flowers?', ['Nectar', 'Water', 'Bark'], 0, 'trivia'],
          ['What do you wear to walk through deep mud?', ['Sandals', 'Rubber boots', 'Slippers'], 1, 'trivia']
        ])
      }
    },
    {
      themeId: 'ocean',
      plotId: 'rescue',
      story: {
        title: 'Rescue at Coral Deep Station',
        tagline: 'A damaged lab on the seabed, and six hours of battery left.',
        prologue: 'Coral Deep is a small research station resting on the seabed, ninety meters below the surface of the Azure Gulf. At 05:10 this morning, an underwater landslide cracked its main power line. Dr. Amara Quinn and two students are trapped inside with six hours of battery left. The rescue submarine Nautilia has come to help, but the station\'s heavy doors have locked themselves, and they will open only to a password chosen by its founder, a marine biologist named Tobin Reyes. He loved the animals of this gulf more than anything else, and his clues are scattered through the outer pods. You are the crew of the Nautilia, and your orange lights are the first thing Dr. Quinn has seen in hours.',
        mission: 'Solve the puzzles, put together what they reveal and find the password that opens the station. Say it at the main door before the battery runs out.',
        chapters: [
          {
            name: 'The Outer Pod',
            intro: 'You dock at the outer pod, where twelve glass tanks glow faintly in the dark. Tobin Reyes kept his field notes here, in a green notebook on a steel desk. He wrote about one old friend who returned to this reef every year for three decades, swimming thousands of kilometers to lay its eggs on the same beach. It carries its home on its back, he wrote, and it never hurries. A photograph on the wall shows him diving beside it, smiling through his mask.',
            word: 'TURTLE',
            type: 'mosaic'
          }
        ],
        puzzleTitles: [],
        finalLock: 'The main door is a wheel of cold steel, and water drips steadily from the ceiling above it. The battery gauge has fallen to a thin red line. On the far side, Dr. Quinn presses her palm to the small window. Speak the password into the grille, clearly and calmly.',
        ending: 'The wheel spins by itself and the great door groans open. Turtle: the old friend who returned to this reef every year. Tobin Reyes made it the password so that nobody could ever enter Coral Deep without remembering why it was built. Dr. Quinn and her two students stumble out, pale and shaking and laughing with relief. Minutes later the Nautilia is rising through green water toward the sun. Outside the window, a shape glides past as if to see you off. Well done, crew. Everyone is coming home.',
        certificate: 'For opening the doors of Coral Deep and bringing its whole crew back to the surface.',
        teamName: 'The Crew of the Nautilia',
        party: {
          letter: 'This is Dr. Amara Quinn of Coral Deep Station, ninety meters down in the Azure Gulf. At 05:10 a landslide cracked our main power line. Two students are with me and we have six hours of battery left. Our doors have locked, and they will open only to a password chosen by our founder, Tobin Reyes. His clues are in the outer pods, which we cannot reach. If you can hear this, you are the only ship in range. Please, take up your Code Sheet and begin. We are counting on you. Dr. Quinn',
          roles: { leader: 'Submarine Captain', scribe: 'Log Keeper', hintKeeper: 'Radio Officer', timekeeper: 'Battery Watcher', codebreaker: 'Marine Biologist', assembler: 'Hull Engineer' },
          reward: 'Coral Deep Medal of Courage'
        },
        questions: qs([
          ['How deep is the station?', ['Ninety meters', 'Ten meters', 'Nine hundred meters'], 0],
          ['What time did the landslide happen?', ['03:40', '05:10', '08:30'], 1],
          ['What is the rescue submarine called?', ['Deepstar', 'Oceana', 'Nautilia'], 2],
          ['How many hours of battery are left?', ['Six', 'Two', 'Twelve'], 0],
          ['What is the name of the trapped scientist?', ['Tobin Reyes', 'Amara Quinn', 'Maya Lund'], 1],
          ['How many students are with her?', ['Five', 'One', 'Two'], 2],
          ['What color are the submarine\'s lights?', ['Orange', 'White', 'Red'], 0],
          ['How many glass tanks are in the outer pod?', ['Six', 'Twelve', 'Twenty'], 1],
          ['What color is the notebook?', ['Red', 'Black', 'Green'], 2],
          ['What body of water is the station in?', ['The Azure Gulf', 'The Coral Sea', 'The Blue Bay'], 0],
          ['What is the desk in the outer pod made of?', ['Wood', 'Steel', 'Glass'], 1],
          ['What cracked the station\'s main power line?', ['A storm', 'A shark', 'An underwater landslide'], 2],
          ['What is the largest animal on Earth?', ['Blue whale', 'Elephant', 'Giant squid'], 0, 'trivia'],
          ['How many arms does an octopus have?', ['Six', 'Eight', 'Ten'], 1, 'trivia'],
          ['Which ocean is the largest?', ['Atlantic', 'Arctic', 'Pacific'], 2, 'trivia'],
          ['What do fish use to breathe underwater?', ['Gills', 'Lungs', 'Fins'], 0, 'trivia'],
          ['Which reef off Australia is the largest in the world?', ['Red Reef', 'Great Barrier Reef', 'Long Reef'], 1, 'trivia'],
          ['What makes seawater taste the way it does?', ['Sugar', 'Sand', 'Salt'], 2, 'trivia'],
          ['Which animal has a star shape and lives on the seabed?', ['Starfish', 'Seal', 'Eel'], 0, 'trivia'],
          ['What device do submarines use to look above the water?', ['Telescope', 'Periscope', 'Compass'], 1, 'trivia']
        ])
      }
    },
    {
      themeId: 'dinosaurs',
      plotId: 'exploration',
      story: {
        title: 'The Valley That Time Forgot',
        tagline: 'One lost expedition, one hidden valley, and footprints far too large.',
        prologue: 'In 1924, the explorer Beatrix Holloway walked into the Mossgate Valley with five porters and a mule named Biscuit. She never walked out. A century later, your team has found her trunk at the mouth of the valley, along with a leather journal and a brass compass that still points north. The journal describes warm springs, giant ferns and footprints as long as a canoe. Its last page says she sealed her greatest discovery in a stone vault, and that only one word can open it. A storm is due in two days, and the river will flood the only way out. Your guide, a cheerful climber called Sefu, has already started up the trail.',
        mission: 'Solve the puzzles, put together what they reveal and find the one word that opens Beatrix Holloway\'s vault. Say it at the stone door before the flood seals the valley.',
        chapters: [
          {
            name: 'The Plated Giant',
            intro: 'The trail climbs through ferns taller than a house. At the first camp, you find three rusted tent pegs and a page pinned to a tree with a thorn. Holloway has sketched a huge plant-eater with a tiny head and a double row of plates along its back. She watched a whole herd of them cross the warm springs at dawn, she wrote, moving as slowly as ships. Sefu points to a line of hollows in the mud, each one wide enough to stand in.',
            word: 'STEGOSAURUS',
            type: 'mosaic'
          }
        ],
        puzzleTitles: [],
        finalLock: 'Rain hammers on the red cliff, and the roar of the river grows louder behind you. Sefu holds up the lantern, and the carved door gleams wet in its light. There is no handle and no keyhole, only a brass grille at the height of your mouth. Speak the word.',
        ending: 'Stone grinds on stone and the door swings inward. Stegosaurus: the living giant she watched cross the warm springs at dawn. Inside the vault lies an egg the size of a pumpkin, turned to rock, and a final note from Beatrix Holloway. She had stayed because she was happy here, she wrote, and she asks only that you take her story home. Sefu leads you along the high ledge just as the river bursts over the trail. A week later, every newspaper in the world carries her name. Well done, explorers.',
        certificate: 'For finding the vault of Beatrix Holloway and bringing her discovery back to the world.',
        teamName: 'The Mossgate Valley Expedition',
        party: {
          letter: 'To whoever finds this trunk: my name is Beatrix Holloway, and I came to the Mossgate Valley in 1924 with five porters and a mule named Biscuit. What I found here changed my life. I have sealed my greatest discovery in a stone vault, and only one word will open it. My clues are scattered along the trail, among the giant ferns and warm springs. Beware the river, for it floods without warning. If you are brave enough to follow me, take up your Code Sheet and begin. Yours in discovery, Beatrix Holloway',
          roles: { leader: 'Expedition Leader', scribe: 'Journal Keeper', hintKeeper: 'Friend of Sefu', timekeeper: 'River Watcher', codebreaker: 'Fossil Hunter', assembler: 'Bone Fitter' },
          reward: 'Holloway Medal of Exploration'
        },
        questions: qs([
          ['In what year did Beatrix Holloway enter the valley?', ['1924', '1899', '1950'], 0],
          ['What was the mule called?', ['Pepper', 'Biscuit', 'Tobin'], 1],
          ['How many porters went with her?', ['Two', 'Ten', 'Five'], 2],
          ['What is the name of the valley?', ['Mossgate', 'Greenfield', 'Stonewater'], 0],
          ['What metal is her compass made of?', ['Silver', 'Brass', 'Iron'], 1],
          ['What is your guide called?', ['Marta', 'Finch', 'Sefu'], 2],
          ['How soon is the storm due?', ['In two days', 'In a week', 'Tonight'], 0],
          ['How long were the footprints said to be?', ['As long as a spoon', 'As long as a canoe', 'As long as a house'], 1],
          ['How many tent pegs are at the first camp?', ['One', 'Nine', 'Three'], 2],
          ['Where was Holloway\'s trunk found?', ['At the mouth of the valley', 'In a cave', 'On a riverboat'], 0],
          ['What held the page to the tree?', ['A nail', 'A thorn', 'A ribbon'], 1],
          ['What is the journal made of?', ['Paper and wood', 'Silk', 'Leather'], 2],
          ['What is a scientist who studies ancient life called?', ['A paleontologist', 'A geologist', 'An astronomer'], 0, 'trivia'],
          ['What do we call the preserved remains of ancient animals?', ['Crystals', 'Fossils', 'Minerals'], 1, 'trivia'],
          ['Which dinosaur was famous for its short arms and huge teeth?', ['Triceratops', 'Diplodocus', 'Tyrannosaurus'], 2, 'trivia'],
          ['How many horns did Triceratops have?', ['Three', 'One', 'Five'], 0, 'trivia'],
          ['What did plant-eating dinosaurs mainly eat?', ['Fish', 'Plants', 'Insects'], 1, 'trivia'],
          ['Modern birds are believed to be related to which ancient animals?', ['Mammoths', 'Sharks', 'Dinosaurs'], 2, 'trivia'],
          ['What melted rock flows out of a volcano?', ['Lava', 'Quartz', 'Tar'], 0, 'trivia'],
          ['What tool points to magnetic north?', ['Sundial', 'Compass', 'Barometer'], 1, 'trivia']
        ])
      }
    },
    {
      themeId: 'egypt',
      plotId: 'curse',
      story: {
        title: 'The Tomb of the Sleeping Queen',
        tagline: 'A sealed tomb, a broken promise, and a desert wind that will not stop.',
        prologue: 'Three thousand years ago, Queen Nefrura ruled the river city of Akhet, and she was laid to rest in the sands west of the Nile. Last Tuesday, the archaeologist Dr. Layla Hassan opened the outer door of her tomb. By nightfall, a hot wind had risen across the valley, and it has not stopped since. Wells are filling with sand, the camels refuse to walk, and the seven workers have all gone home. An inscription on the door warns that the queen must be greeted with a sacred word, or the wind will bury the valley. Dr. Hassan is out of water and out of time. She has only her old assistant Karim, a lantern, and you.',
        mission: 'Solve the puzzles, put together what they reveal and find the sacred word of Queen Nefrura. Speak it in the burial chamber before the wind buries the valley.',
        chapters: [
          {
            name: 'The Road to the Tomb',
            intro: 'You walk the last two kilometers with scarves across your faces. Karim leads the way, carrying a jar of water and a coil of blue rope. Far across the sand rises the shape the workers call the Mountain of Kings, its four smooth sides pointing to the sky. Nefrura ordered a small copy of it built above her own tomb, so that she would not be forgotten. Its stones are carved with stars, and on the east face you find the first line of her message.',
            word: 'PYRAMID',
            type: 'mosaic'
          }
        ],
        puzzleTitles: [],
        finalLock: 'The burial chamber is small and very still. The painted face of Queen Nefrura looks up from her golden coffin, calm and patient. Behind you, the sand hisses down the steps, and Karim\'s lantern gutters. Dr. Hassan nods to you. Say the word to the queen, and say it with respect.',
        ending: 'For a moment there is no sound at all. Then, high above, the wind drops. Pyramid: the monument that remembers. Nefrura asked only that those who woke her should remember her name, and today you have. When you climb back into the sun, the air is clear and the sand lies still. Karim laughs and pours out the last of the water, and far away a camel bellows. Dr. Hassan closes the door gently behind her. The valley is safe, and the queen sleeps on.',
        certificate: 'For greeting Queen Nefrura with the sacred words and saving the valley of Akhet.',
        teamName: 'The Friends of Queen Nefrura',
        party: {
          letter: 'To anyone who can still reach the valley: my name is Dr. Layla Hassan. Last Tuesday we opened the outer door of the tomb of Queen Nefrura, and by nightfall a hot wind had risen that will not stop. The wells are filling with sand and my seven workers have gone home. The inscription says the queen must be greeted with a sacred word, or the wind will bury us all. Only Karim remains with me. I beg you to come quickly. Take up your Code Sheet and begin. Dr. Hassan',
          roles: { leader: 'High Priest', scribe: 'Royal Scribe', hintKeeper: 'Friend of Karim', timekeeper: 'Watcher of the Sand', codebreaker: 'Tomb Scholar', assembler: 'Stone Mason' },
          reward: 'Golden Seal of Queen Nefrura'
        },
        questions: qs([
          ['What is the name of the queen?', ['Nefrura', 'Isolde', 'Marta'], 0],
          ['What was the name of her river city?', ['Thebes', 'Akhet', 'Luxor'], 1],
          ['On what day was the outer door opened?', ['Friday', 'Sunday', 'Tuesday'], 2],
          ['What is the archaeologist\'s name?', ['Dr. Layla Hassan', 'Dr. Amara Quinn', 'Dr. Priya Rao'], 0],
          ['What is the assistant called?', ['Sefu', 'Karim', 'Tobin'], 1],
          ['How many workers went home?', ['Three', 'Twelve', 'Seven'], 2],
          ['How long ago did the queen rule?', ['Three thousand years', 'Five hundred years', 'Ten thousand years'], 0],
          ['What color is Karim\'s rope?', ['Red', 'Blue', 'White'], 1],
          ['What are carved on the stones?', ['Birds', 'Snakes', 'Stars'], 2],
          ['How far do you walk across the sand?', ['Two kilometers', 'Ten kilometers', 'Half a kilometer'], 0],
          ['On which face of the stones is her message?', ['The north face', 'The east face', 'The west face'], 1],
          ['What are the wells filling with?', ['Mud', 'Salt', 'Sand'], 2],
          ['Which great river flows through Egypt?', ['The Nile', 'The Amazon', 'The Rhine'], 0, 'trivia'],
          ['What was a ruler of ancient Egypt usually called?', ['An emperor', 'A pharaoh', 'A sultan'], 1, 'trivia'],
          ['What did ancient Egyptians write on, made from a river plant?', ['Silk', 'Slate', 'Papyrus'], 2, 'trivia'],
          ['What is the picture writing of ancient Egypt called?', ['Hieroglyphs', 'Runes', 'Cursive'], 0, 'trivia'],
          ['Which animal has a lion\'s body and a human head?', ['A griffin', 'The Sphinx', 'A unicorn'], 1, 'trivia'],
          ['In which desert is most of Egypt?', ['Gobi', 'Kalahari', 'Sahara'], 2, 'trivia'],
          ['What were Egyptian bodies preserved as?', ['Mummies', 'Statues', 'Fossils'], 0, 'trivia'],
          ['Which animal did ancient Egyptians famously honor at home?', ['Wolves', 'Cats', 'Parrots'], 1, 'trivia']
        ])
      }
    }
  ];
})(typeof self !== 'undefined' ? self : globalThis);
