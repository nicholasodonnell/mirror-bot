const commander = require('commander')
const { compose, evolve, tap, uncurryN } = require('ramda')
const VError = require('verror')

const createMissingPathsOn = require('./lib/createMissingPathsOn')
const getFilesFrom = require('./lib/getFilesFrom')
const getMissingFilesFrom = require('./lib/getMissingFilesFrom')
const getUnsyncedFilesIn = require('./lib/getUnsyncedFilesIn')
const removeFilesFrom = require('./lib/removeFilesFrom')
const serializeFilesFrom = require('./lib/serializeFilesFrom')
const setPerimissionsFor = require('./lib/setPerimissionsFor')
const { loadSnapshot, saveSnapshot } = require('./lib/snapshot')
const symlinkFilesTo = require('./lib/symlinkFilesTo')
const syncFilesTo = require('./lib/syncFilesTo')

const parseNumber = value => {
  const parsedValue = parseInt(value, 10)

  if (isNaN(parsedValue)) {
    throw new commander.InvalidOptionArgumentError('Not a number.')
  }

  return parsedValue
}

const parseOpts = evolve({
  safeDelete: parseNumber,
  puid: parseNumber,
  pgid: parseNumber,
})

const getFilesAndSerializeFrom = dir =>
  compose(
    serializeFilesFrom(dir),
    getFilesFrom,
  )(dir)

const removeFilesThatDontExistOnFrom = uncurryN(4, (opts, getFrom, removeFrom) =>
  compose(
    removeFilesFrom(opts, removeFrom),
    getMissingFilesFrom(getFrom),
  ),
)

const syncUnsycnedFilesTo = uncurryN(2, dir =>
  compose(
    syncFilesTo(dir),
    tap(createMissingPathsOn(dir)),
    getUnsyncedFilesIn,
  ),
)

const symlinkMissingFilesTo = uncurryN(2, dir =>
  compose(
    symlinkFilesTo(dir),
    tap(createMissingPathsOn(dir)),
    getMissingFilesFrom(dir),
  ),
)

const mirrorBot = opts => {
  const {
    permissions,
    pgid,
    primary,
    puid,
    replica,
    safeDelete = 10,
    snapshot,
  } = opts

  console.log(`------------------------------`)
  console.log(`\n[Starting Mirror Bot - ${new Date().toLocaleString()}]:`)
  console.log(`Opts: ${JSON.stringify(opts)}`)

  try {
    // grab previous snapshot
    console.log('\n[Loading previous snapshot]:')
    const replicaSnapshotFiles = loadSnapshot(snapshot)

    // remove any files that were deleted on the replica directory from the primary directory
    console.log('\n[Removing deleted files]:')
    removeFilesThatDontExistOnFrom({ safeDelete }, replica, primary, replicaSnapshotFiles)

    // move any non-symlinked files that exist on the replica directory to the primary directory
    // and symlink back to the replica directory
    console.log('\n[Syncing unsynced files]:')
    const replicaFiles = getFilesAndSerializeFrom(replica)
    syncUnsycnedFilesTo(primary, replicaFiles)

    // symlink any files that exist on the primary directory to the replica directory
    console.log('\n[Symlinking missing files]:')
    const primaryFiles = getFilesAndSerializeFrom(primary)
    symlinkMissingFilesTo(replica, primaryFiles)

    // remove any files that were deleted on the primary directory from the replica directory.
    console.log('\n[Removing files that no longer exist]:')
    removeFilesThatDontExistOnFrom({ safeDelete }, primary, replica, replicaFiles)

    // save latest snapshot
    console.log('\n[Saving latest snapshot]:')
    saveSnapshot(snapshot, getFilesAndSerializeFrom(replica))

    // set replica permissions
    console.log('\n[Setting permissions]:')
    setPerimissionsFor(replica, { permissions, pgid, puid })

    console.log(`\n[Mirror bot complete - ${new Date().toLocaleString()}]`)
  } catch (e) {
    const error = new VError(e, `Mirror Bot failed`)

    console.log(`\n[Mirror Bot failed - ${new Date().toLocaleString()}]:`)
    console.error(VError.fullStack(error))

    throw error
  } finally {
    console.log(`\n------------------------------\n\n`)
  }
}

if (require.main === module) {
  const opts = commander.program
    .requiredOption('--primary <path>', 'Primary path')
    .requiredOption('--replica <path>', 'Replica path')
    .requiredOption('--snapshot <path>', 'Snapshot path')
    .option('--safeDelete <number>', 'Number of items to safely delete')
    .option('--permissions <string>', 'Replica permissions')
    .option('--puid <string>', 'Replica owner user')
    .option('--pgid <string>', 'Replica owner group')
    .parse(process.argv)
    .opts()

  try {
    mirrorBot(parseOpts(opts))

    process.exit(0)
  } catch (e) {
    process.exit(1)
  }
}

module.exports = mirrorBot
