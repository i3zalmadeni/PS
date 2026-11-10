-- 0012: منح صلاحيات الجداول لدور authenticated (الحماية الفعلية عبر سياسات RLS)
grant select,insert,update on academic_years,class_sections,facilities,facility_types,grade_levels,guardians,school_leadership,school_profile,school_year_stats,staff_year_records,student_enrollments,student_guardians,student_private,students to authenticated;
grant delete on facility_equipment,facilities,students,student_enrollments,student_guardians,student_private,guardians,school_leadership,staff_members,staff_private to authenticated;
grant select,insert,update,delete on facility_equipment to authenticated;
grant select on system_access_logs,change_events to authenticated;
