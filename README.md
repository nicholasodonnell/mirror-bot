<img src="logo/logo.png" />

**Mirror Bot** is a file manager that syncs two directories: a **replica** which acts as a mirror, and a **primary** which acts as an authority. Mirror bot has four goals:
1. Move any non-symlinked files that exist on the replica directory to the primary directory.
2. Symlink any files that exist on the primary directory to the replica directory.
3. Remove any files that were deleted on the primary directory from the replica directory.
4. Remove any files that were deleted on the replica directory from the primary directory (see below).

After a sync occurs Mirror bot takes a snapshot of the replica directory. Upon a subsequent sync any files that were removed on the replica directory will be removed from the primary directory.

### Requirements

- [Docker](https://www.docker.com/get-started)
- [GNU make](https://www.gnu.org/software/make/)

## Setup

1. Build the docker images by running `make build`.
2. Create a `snapshot.json` file by running `touch snapshot.json`.

## Usage

```bash
docker run \
  --name mirror-bot \
  --rm \
  --volume <primaryDirectoryHostPath>:<primaryDirectoryContainerPath> \
  --volume <replicaDirectoryHostPath>:<replicaDirectoryContainerPath> \
  --volume <snapshotPath>:/snapshot.json \
  nicholasodonnell/mirror-bot:latest \
    --primary=<primaryDirectoryContainerPath> \
    --replica=<replicaDirectoryContainerPath> \
    --snapshot=/snapshot.json \
    [--safeDelete=<safeDelete>] \
    [--permissions=<permissions>] \
    [--puid=<puid>] \
    [--pgid=<pgid>]
```

```bash
node index \
  --primary=<primaryDirectoryHostPath> \
  --replica=<replicaDirectoryHostPath> \
  --snapshot=<snapshotPath> \
  [--safeDelete=<safeDelete>] \
  [--permissions=<permissions>] \
  [--puid=<puid>] \
  [--pgid=<pgid>]
```

## Paths

All paths given should be **absolute**. See below for more details:

| Path                            | Description                                           |
| ------------------------------- | ----------------------------------------------------- |
| `primaryDirectoryHostPath`      | Host path for the primary directory.                  |
| `primaryDirectoryContainerPath` | Container path for the primary directory (see below). |
| `replicaDirectoryHostPath`      | Host path for the replica directory.                  |
| `replicaDirectoryContainerPath` | Container path for the replica directory.             |
| `snapshotPath`                  | Host path for the replica's snapshot.json file.       |

When using docker please note that any symlinks created will point to the primary directory **as mounted on the container**. This can be useful when you're using the primary & replica directories in other containers such as Plex. Otherwise, ensure the paths on your host and container are identical for symlinks to work properly.

## Options

| Option        | Description                                                                                                                    | Default   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------- |
| `primary`     | Path for the primary directory.                                                                                                | Required  |
| `replica`     | Path for the replica directory.                                                                                                | Required  |
| `snapshot`    | Host path for the replica's snapshot.json file.                                                                                | Required  |
| `safeDelete`  | Number of files that can be safely deleted. If the number of files to delete is greater than this value, they will be ignored. | `10`      |
| `permissions` | CHMOD permissions of the replica directory.                                                                                    | undefined |
| `puid`        | CHOWN user of the replica directory.                                                                                           | undefined |
| `pgid`        | CHOWN group of the replica directory.                                                                                          | undefined |

