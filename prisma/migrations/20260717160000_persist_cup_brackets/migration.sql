CREATE TABLE `cup_brackets` (
  `id` VARCHAR(191) NOT NULL,
  `tournamentName` VARCHAR(191) NOT NULL,
  `model` VARCHAR(191) NOT NULL,
  `byeTeamIds` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `cup_brackets_model_key`(`model`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `cup_bracket_matches` (
  `id` VARCHAR(191) NOT NULL,
  `bracketId` VARCHAR(191) NOT NULL,
  `order` INTEGER NOT NULL,
  `homeTeamId` VARCHAR(191) NOT NULL,
  `awayTeamId` VARCHAR(191) NOT NULL,
  `firstHomeScore` INTEGER NULL,
  `firstAwayScore` INTEGER NULL,
  `secondHomeScore` INTEGER NULL,
  `secondAwayScore` INTEGER NULL,
  `extraHomeScore` INTEGER NULL,
  `extraAwayScore` INTEGER NULL,
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `cup_bracket_matches_homeTeamId_idx`(`homeTeamId`),
  INDEX `cup_bracket_matches_awayTeamId_idx`(`awayTeamId`),
  UNIQUE INDEX `cup_bracket_matches_bracketId_order_key`(`bracketId`, `order`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `cup_bracket_matches`
  ADD CONSTRAINT `cup_bracket_matches_bracketId_fkey`
  FOREIGN KEY (`bracketId`) REFERENCES `cup_brackets`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `cup_bracket_matches`
  ADD CONSTRAINT `cup_bracket_matches_homeTeamId_fkey`
  FOREIGN KEY (`homeTeamId`) REFERENCES `teams`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `cup_bracket_matches`
  ADD CONSTRAINT `cup_bracket_matches_awayTeamId_fkey`
  FOREIGN KEY (`awayTeamId`) REFERENCES `teams`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
