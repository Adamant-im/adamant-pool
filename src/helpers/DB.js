import {Low, JSONFile} from 'lowdb';

import {join, dirname} from 'path';
import {fileURLToPath} from 'url';

import syncNedb from './syncNedb.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const prefix = process.env.NODE_ENV === 'test' ?
    '_test' :
    '';

export const dbTrans = syncNedb(new Low(
    new JSONFile(
        join(__dirname, `../../db/transactions${prefix}.json`),
    ),
));

export const dbBlocks = syncNedb(new Low(
    new JSONFile(
        join(__dirname, `../../db/blocks${prefix}.json`),
    ),
));

export const dbVoters = syncNedb(new Low(
    new JSONFile(
        join(__dirname, `../../db/voters${prefix}.json`),
    ),
), 60 * 1000 * 60);
