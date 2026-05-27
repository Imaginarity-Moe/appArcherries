-- Coach-Rolle: zusätzlich zu admin/member. Coaches haben Read-Zugriff auf
-- alle Trainings ihrer Vereinsmitglieder (siehe user_can_access_training in
-- routes/trainings.php). Promotion/Demotion via PATCH /clubs/<id>/members/<uid>
-- nur durch Admin.
ALTER TABLE club_members
    MODIFY COLUMN role ENUM('admin', 'member', 'coach') NOT NULL DEFAULT 'member';
