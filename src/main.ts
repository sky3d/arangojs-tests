import { Database, aql } from "arangojs"
import { Collection, DocumentCollection } from "arangojs/collection"
import { Document, DocumentSelector } from "arangojs/documents"
import { ArangoError } from "arangojs/error"

const dbConfig = {
  url: "http://localhost:8529", //
  databaseName: "interactive",
  auth: { username: "root", password: "__SET_ROOT_PASS__" },
}

const GAMES_COLLECTION_NAME = "games"


interface Game {
  _id?: string
  game_id: string
  type: number
  name: string
  details?: any
}

const createGame = (name: string) => ({
  game_id: '1',
  type: 2,
  name,
  details: { prop1: 123 }
})

async function aqlFiltered(db: Database) {
  const type: number = 0
  const name = 'manual_created'
  try {
    const cursor = await db.query(`
      FOR g IN ${GAMES_COLLECTION_NAME}
      FILTER g.type == ${type}
      RETURN g
    `)
    console.log(`Games filtered by AQL`);
    // for await (const game of cursor) {
    //   console.log(game);
    // }
    const docs: any[] = await cursor.all()

    console.log(docs.length)
    console.log(docs[0])

  } catch (err) {
    console.error(err.message);
  }
}

const insertText = (db: Database, gameName: string) => db.query(`
INSERT {
  type: 1,
  name: ${gameName},
  details: {}
} IN games
`)

async function setupDb(db: Database) {
  const list = await db.listCollections()
  const coll = await db.createCollection<Game>(GAMES_COLLECTION_NAME)
}

async function main() {
  const db = new Database(dbConfig);
  await db.waitForPropagation(
    { path: `/_api/collection/${GAMES_COLLECTION_NAME}` },
    10000
  );
  //await setupDb(db)

  await aqlFiltered(db)

  // collection
  const games = db.collection<Game>(GAMES_COLLECTION_NAME)

  // count
  const data = await games.count()
  console.log('COUNT=', data.count);

  // get doc
  const selector: DocumentSelector = { // _id  _key 
    _id: 'games/26579'
  }
  const res = await games.documentExists(selector)
  console.log('DOC_EXISTS=', res);

  const res1 = await games.document("p1", { graceful: true }) //return null instead of exc
  console.log(res1);
  const res2 = await games.document("26579", { graceful: true })
  //const res1= games.firstExample({ game_id: '1'})
  console.log(res2);

  const game1: Game = createGame('game2');
  const meta = await games.save(game1, { returnNew: true });
  const doc = meta.new;
  console.log('DOC', doc)
  console.log(games.documentId(meta)); // via meta._id
  console.log(games.documentId(doc)); // via doc._id
  console.log(games.documentId(meta._key)); // also works

  // Update by game name 

  const condition = { name: 'game2' }

  const is42Exists = await games.documentExists('42')
  if (!is42Exists) {
    const game42 = createGame('GAME-42')
    const g42 = await games.save({ _key: '42', ...game42 })
    console.log('GAME 42 successfully created', g42)
  }
  else {
    console.log('GAME 42 is already created');
  }

  const partUpdate = { type: 4, details: { prop2: 'abc' } }
  const doc2 = await games.update('42', partUpdate, { returnNew: true })
  console.log('UPDATED', doc2)

  const replace = { details: { prop3: 'replaced' } }
  const doc3 = await games.update('42', replace, { returnNew: true, mergeObjects: false })
  console.log('REPLACED', doc3)

  // Try find non-existent
  try {
    await games.document("non-existent")
  } catch (e: any | ArangoError) {
    console.log(e.message); // document not found
    console.log(e.code); // 404
  }
}

main();
