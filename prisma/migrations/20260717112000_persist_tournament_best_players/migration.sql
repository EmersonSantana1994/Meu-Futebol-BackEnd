CREATE TABLE `tournament_finalization_best_players` (
  `id` VARCHAR(191) NOT NULL,
  `finalizationId` VARCHAR(191) NOT NULL,
  `playerId` VARCHAR(191) NOT NULL,
  `position` INTEGER NOT NULL,

  INDEX `tournament_finalization_best_players_playerId_idx`(`playerId`),
  UNIQUE INDEX `tournament_finalization_best_players_finalizationId_position_key`(`finalizationId`, `position`),
  UNIQUE INDEX `tournament_finalization_best_players_finalizationId_playerId_key`(`finalizationId`, `playerId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `tournament_finalization_best_players`
  ADD CONSTRAINT `tournament_finalization_best_players_finalizationId_fkey`
  FOREIGN KEY (`finalizationId`) REFERENCES `tournament_finalizations`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `tournament_finalization_best_players`
  ADD CONSTRAINT `tournament_finalization_best_players_playerId_fkey`
  FOREIGN KEY (`playerId`) REFERENCES `players`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
