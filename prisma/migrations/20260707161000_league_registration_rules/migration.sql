-- DropForeignKey
ALTER TABLE `players` DROP FOREIGN KEY `players_teamId_fkey`;

-- AlterTable
ALTER TABLE `players` ADD COLUMN `leagueId` VARCHAR(191) NULL,
    MODIFY `teamId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `teams` ADD COLUMN `leagueId` VARCHAR(191) NOT NULL,
    ADD COLUMN `ownerPlayerId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `transfers` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('TEAM_SWAP', 'FREE_AGENT') NOT NULL,
    `targetTeamId` VARCHAR(191) NOT NULL,
    `targetPlayerId` VARCHAR(191) NOT NULL,
    `replacementPlayerId` VARCHAR(191) NOT NULL,
    `sourceTeamId` VARCHAR(191) NULL,
    `releasedPlayerId` VARCHAR(191) NULL,
    `nextOwnerPlayerId` VARCHAR(191) NULL,
    `previousTargetTeamId` VARCHAR(191) NULL,
    `previousTargetLeagueId` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `transfers_targetTeamId_idx`(`targetTeamId`),
    INDEX `transfers_sourceTeamId_idx`(`sourceTeamId`),
    INDEX `transfers_targetPlayerId_idx`(`targetPlayerId`),
    INDEX `transfers_replacementPlayerId_idx`(`replacementPlayerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `players_leagueId_idx` ON `players`(`leagueId`);

-- CreateIndex
CREATE UNIQUE INDEX `teams_ownerPlayerId_key` ON `teams`(`ownerPlayerId`);

-- CreateIndex
CREATE INDEX `teams_leagueId_idx` ON `teams`(`leagueId`);

-- AddForeignKey
ALTER TABLE `teams` ADD CONSTRAINT `teams_leagueId_fkey` FOREIGN KEY (`leagueId`) REFERENCES `competitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teams` ADD CONSTRAINT `teams_ownerPlayerId_fkey` FOREIGN KEY (`ownerPlayerId`) REFERENCES `players`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `players` ADD CONSTRAINT `players_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `players` ADD CONSTRAINT `players_leagueId_fkey` FOREIGN KEY (`leagueId`) REFERENCES `competitions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_targetTeamId_fkey` FOREIGN KEY (`targetTeamId`) REFERENCES `teams`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_sourceTeamId_fkey` FOREIGN KEY (`sourceTeamId`) REFERENCES `teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_targetPlayerId_fkey` FOREIGN KEY (`targetPlayerId`) REFERENCES `players`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_replacementPlayerId_fkey` FOREIGN KEY (`replacementPlayerId`) REFERENCES `players`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_releasedPlayerId_fkey` FOREIGN KEY (`releasedPlayerId`) REFERENCES `players`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
