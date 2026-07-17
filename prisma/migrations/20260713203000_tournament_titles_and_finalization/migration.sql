ALTER TABLE `competitions` MODIFY `cupModel` ENUM('SEMIFINALS', 'SIX_TEAMS', 'QUARTERFINALS', 'ROUND_OF_16') NULL;

CREATE TABLE `tournament_title_types` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `tournament_title_types_name_key`(`name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `player_tournament_titles` (
  `id` VARCHAR(191) NOT NULL,
  `season` VARCHAR(191) NOT NULL,
  `playerId` VARCHAR(191) NOT NULL,
  `titleTypeId` VARCHAR(191) NOT NULL,
  `titles` INTEGER NOT NULL DEFAULT 0,
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `player_tournament_titles_playerId_idx`(`playerId`),
  INDEX `player_tournament_titles_titleTypeId_idx`(`titleTypeId`),
  UNIQUE INDEX `player_tournament_titles_season_playerId_titleTypeId_key`(`season`, `playerId`, `titleTypeId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `tournament_finalizations` (
  `id` VARCHAR(191) NOT NULL,
  `competitionId` VARCHAR(191) NOT NULL,
  `season` VARCHAR(191) NOT NULL,
  `tournamentName` VARCHAR(191) NOT NULL,
  `titleTypeId` VARCHAR(191) NOT NULL,
  `championTeamId` VARCHAR(191) NOT NULL,
  `runnerUpTeamId` VARCHAR(191) NULL,
  `thirdTeamId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `tournament_finalizations_competitionId_idx`(`competitionId`),
  INDEX `tournament_finalizations_season_idx`(`season`),
  INDEX `tournament_finalizations_titleTypeId_idx`(`titleTypeId`),
  INDEX `tournament_finalizations_championTeamId_idx`(`championTeamId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `player_tournament_titles` ADD CONSTRAINT `player_tournament_titles_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `players`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `player_tournament_titles` ADD CONSTRAINT `player_tournament_titles_titleTypeId_fkey` FOREIGN KEY (`titleTypeId`) REFERENCES `tournament_title_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `tournament_finalizations` ADD CONSTRAINT `tournament_finalizations_competitionId_fkey` FOREIGN KEY (`competitionId`) REFERENCES `competitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `tournament_finalizations` ADD CONSTRAINT `tournament_finalizations_titleTypeId_fkey` FOREIGN KEY (`titleTypeId`) REFERENCES `tournament_title_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `tournament_finalizations` ADD CONSTRAINT `tournament_finalizations_championTeamId_fkey` FOREIGN KEY (`championTeamId`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `tournament_finalizations` ADD CONSTRAINT `tournament_finalizations_runnerUpTeamId_fkey` FOREIGN KEY (`runnerUpTeamId`) REFERENCES `teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
