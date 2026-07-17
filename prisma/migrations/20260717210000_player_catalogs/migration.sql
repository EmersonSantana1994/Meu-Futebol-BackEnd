CREATE TABLE `player_positions` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `nameKey` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `player_positions_nameKey_key`(`nameKey`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `countries` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `nameKey` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `countries_nameKey_key`(`nameKey`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `player_positions` (`id`, `name`, `nameKey`, `updatedAt`)
SELECT UUID(), MIN(TRIM(`position`)), LOWER(TRIM(`position`)), CURRENT_TIMESTAMP(3)
FROM `players`
WHERE `position` IS NOT NULL AND TRIM(`position`) <> ''
GROUP BY LOWER(TRIM(`position`));

INSERT INTO `countries` (`id`, `name`, `nameKey`, `updatedAt`)
SELECT UUID(), MIN(TRIM(`country`)), LOWER(TRIM(`country`)), CURRENT_TIMESTAMP(3)
FROM `players`
WHERE `country` IS NOT NULL AND TRIM(`country`) <> ''
GROUP BY LOWER(TRIM(`country`));
