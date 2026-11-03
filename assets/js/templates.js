// Built-in story templates for sellers who don't want to use an AI.
// Same shape as the JSON the AI prompt asks for.
window.STORY_TEMPLATES = [
  {
    id: 'christmas-eve-lockdown',
    themeId: 'christmas',
    plotId: 'lockdown',
    story: {
      title: 'The Christmas Eve Lockdown',
      tagline: 'The workshop is sealed. The reindeer fly at midnight.',
      prologue: 'It is the night before Christmas, and something has gone terribly wrong at the North Pole. At six o\'clock, a blizzard of glittering frost swept through the village and froze every lock in Santa\'s workshop. The toys are trapped inside, the reindeer are pacing in their stables, and Santa\'s great brass clock is ticking towards midnight. Head Elf Pip found an old note pinned to the workshop door, written in silver ink: "Only the true words may open the frozen door." Mrs. Claus believes the frost was cast by Jack Frost himself, who was not invited to this year\'s party.',
      mission: 'Solve every frozen puzzle to recover the secret words. Put them together to break Jack Frost\'s spell before the clock strikes twelve.',
      chapters: [
        {
          name: 'The Frozen Workshop',
          intro: 'Pip leads you through the toy hall. Icicles hang from the shelves and the rocking horses are coated in frost. On each workbench lies a sheet of strange dotted patterns, glowing faintly blue. "Jack Frost hid the first word in these," whispers Pip. "Trace each one and see what the frost reveals."',
          riddle: 'Pulled from a hat or found in a wand, it makes the impossible happen.',
          word: 'MAGIC'
        },
        {
          name: 'The Frozen Stables',
          intro: 'With the first word recovered, a door creaks open to the stables. Santa\'s great red sled is frozen to the floor, and its long runners are carved with more frost patterns. Dasher stamps her hoof impatiently. Only eleven minutes of power remain in the reindeer\'s silver bells, and the snow outside is falling faster. Pip lights a lantern and hands you a pencil.',
          riddle: 'It has runners but never races on foot, and it flies once a year.',
          word: 'SLEIGH'
        }
      ],
      puzzleTitles: [
        'Frost on the rocking horse',
        'The toymaker\'s bench',
        'A drawer of frozen bells',
        'Icicles over the door',
        'The silent music box',
        'Frost on the sled runners',
        'Dasher\'s frozen harness',
        'The empty sack',
        'Hoofprints in the ice',
        'The silver bells',
        'Jack Frost\'s last seal'
      ],
      finalLock: 'You stand before the great frozen door of the workshop. The silver ink on Pip\'s note begins to shimmer. Speak the two true words aloud, together, and the frost will have no choice but to melt.',
      ending: 'As the last word is spoken, a warm golden light spreads through the workshop. The ice cracks, drips and vanishes. The toys tumble out, the bells ring, and Santa climbs into the sleigh with a booming laugh. Far away on a frozen hill, Jack Frost smiles. Next year, he decides, he will ask for an invitation instead. The elves cheer, Pip hugs everyone twice, and Mrs. Claus hands out warm gingerbread. Merry Christmas, heroes of the North Pole!',
      certificate: 'For bravely breaking Jack Frost\'s spell and saving Christmas Eve.',
      teamName: 'The North Pole Rescue Team',
      questions: [
        { q: 'At what time did the blizzard of frost sweep through the village?', options: ['Six o\'clock', 'Midnight', 'Noon'], answer: 0, kind: 'story' },
        { q: 'What colour was the ink on the note pinned to the workshop door?', options: ['Gold', 'Silver', 'Red'], answer: 1, kind: 'story' },
        { q: 'Who found the note on the workshop door?', options: ['Mrs. Claus', 'Dasher', 'Head Elf Pip'], answer: 2, kind: 'story' },
        { q: 'Who does Mrs. Claus believe cast the frost?', options: ['Jack Frost', 'The Snow Queen', 'A grumpy reindeer'], answer: 0, kind: 'story' },
        { q: 'Why was Jack Frost upset?', options: ['He lost his sled', 'He was not invited to the party', 'His toys were broken'], answer: 1, kind: 'story' },
        { q: 'What does Santa\'s clock in the story look like?', options: ['A tiny wooden clock', 'A glowing crystal clock', 'A great brass clock'], answer: 2, kind: 'story' },
        { q: 'What was coated in frost in the toy hall?', options: ['The rocking horses', 'The teddy bears', 'The chimneys'], answer: 0, kind: 'story' },
        { q: 'What colour did the dotted patterns glow?', options: ['Green', 'Faint blue', 'Bright red'], answer: 1, kind: 'story' },
        { q: 'Which reindeer stamps her hoof in the stables?', options: ['Comet', 'Cupid', 'Dasher'], answer: 2, kind: 'story' },
        { q: 'Where are the frost patterns in the stables carved?', options: ['On the sled runners', 'On the stable doors', 'On the hay bales'], answer: 0, kind: 'story' },
        { q: 'How many minutes of power remain in the reindeer\'s bells?', options: ['Five', 'Eleven', 'Twenty'], answer: 1, kind: 'story' },
        { q: 'What is trapped inside the frozen workshop?', options: ['The elves', 'The reindeer', 'The toys'], answer: 2, kind: 'story' },
        { q: 'In which country is Christmas Day celebrated on 7 January by many people?', options: ['Russia', 'Canada', 'Australia'], answer: 0, kind: 'trivia' },
        { q: 'Which plant is traditionally hung so people can kiss beneath it?', options: ['Holly', 'Mistletoe', 'Ivy'], answer: 1, kind: 'trivia' },
        { q: 'In the carol "The Twelve Days of Christmas", what bird sits in a pear tree?', options: ['A robin', 'A dove', 'A partridge'], answer: 2, kind: 'trivia' },
        { q: 'Which country gave a giant Christmas tree to London every year since 1947?', options: ['Norway', 'Sweden', 'Finland'], answer: 0, kind: 'trivia' },
        { q: 'What is the name for the Christmas season song sung door to door?', options: ['A ballad', 'A carol', 'An anthem'], answer: 1, kind: 'trivia' },
        { q: 'What shape is a traditional candy cane?', options: ['A circle', 'A star', 'A hook, like the letter J'], answer: 2, kind: 'trivia' },
        { q: 'On which date is Christmas Eve?', options: ['24 December', '25 December', '31 December'], answer: 0, kind: 'trivia' },
        { q: 'What do children traditionally hang up for Santa to fill?', options: ['Hats', 'Stockings', 'Mittens'], answer: 1, kind: 'trivia' }
      ]
    }
  }
];
