import {
    heatScoresSchema,
    playerSchema,
    trainerSchema
} from '@/db/models/schema.types';

const zeroHeats = {
    heatOne: 0,
    heatTwo: 0,
    heatThree: 0,
    heatFour: 0,
    heatFive: 0,
    heatSix: 0,
    heatSeven: 0
};

test.each([
    ['heat results', heatScoresSchema, zeroHeats],
    ['player scores', playerSchema, { ...zeroHeats, setPlay: 0 }],
    ['trainer scores', trainerSchema, { ...zeroHeats, setPlay: 0 }]
])(
    '%s fill missing scores with zero and preserve reported scores',
    (_, schema, defaults) => {
        expect(schema.parse({})).toEqual(defaults);
        expect(schema.parse({ heatOne: 2.5, heatSeven: undefined })).toEqual({
            ...defaults,
            heatOne: 2.5
        });
    }
);
