UPDATE `competitions`
SET `type` = 'CUP'
WHERE `type` = 'SUPER_CUP';

UPDATE `matches`
SET `stage` = 'FINAL'
WHERE `stage` = 'SUPER_CUP';

ALTER TABLE `competitions`
MODIFY `type` ENUM('LEAGUE', 'CUP') NOT NULL;

ALTER TABLE `matches`
MODIFY `stage` ENUM('LEAGUE', 'ROUND_OF_16', 'QUARTERFINAL', 'SEMIFINAL', 'FINAL', 'THIRD_PLACE') NOT NULL;
