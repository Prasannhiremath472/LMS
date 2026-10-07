import { Routes, Route, Navigate } from 'react-router-dom'
import { RequireRole } from './auth/RequireRole'
import Login from './pages/Login'

import StudentLayout from './routes/student/StudentLayout'
import StudentDashboard from './routes/student/Dashboard'
import StudentCourses from './routes/student/Courses'
import StudentCourseDetail from './routes/student/CourseDetail'
import StudentLessonView from './routes/student/LessonView'
import StudentLiveClasses from './routes/student/LiveClasses'
import StudentFees from './routes/student/Fees'
import StudentCertificates from './routes/student/Certificates'

import TrainerLayout from './routes/trainer/TrainerLayout'
import TrainerDashboard from './routes/trainer/Dashboard'
import TrainerBatches from './routes/trainer/Batches'
import TrainerGrading from './routes/trainer/Grading'
import TrainerLiveClasses from './routes/trainer/LiveClasses'

import AdminLayout from './routes/admin/AdminLayout'
import AdminDashboard from './routes/admin/Dashboard'
import AdminStudents from './routes/admin/Students'
import AdminTrainers from './routes/admin/Trainers'
import AdminCourses from './routes/admin/Courses'
import AdminCourseDetail from './routes/admin/CourseDetail'
import AdminBatches from './routes/admin/Batches'
import AdminBatchDetail from './routes/admin/BatchDetail'
import AdminPayments from './routes/admin/Payments'
import AdminReports from './routes/admin/Reports'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RequireRole roles={['student']} />}>
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="courses" element={<StudentCourses />} />
          <Route path="courses/:id" element={<StudentCourseDetail />} />
          <Route path="courses/:courseId/lessons/:lessonId" element={<StudentLessonView />} />
          <Route path="live" element={<StudentLiveClasses />} />
          <Route path="fees" element={<StudentFees />} />
          <Route path="certificates" element={<StudentCertificates />} />
        </Route>
      </Route>

      <Route element={<RequireRole roles={['trainer']} />}>
        <Route path="/trainer" element={<TrainerLayout />}>
          <Route index element={<TrainerDashboard />} />
          <Route path="batches" element={<TrainerBatches />} />
          <Route path="grading" element={<TrainerGrading />} />
          <Route path="live" element={<TrainerLiveClasses />} />
        </Route>
      </Route>

      <Route element={<RequireRole roles={['admin']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="trainers" element={<AdminTrainers />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="courses/:id" element={<AdminCourseDetail />} />
          <Route path="batches" element={<AdminBatches />} />
          <Route path="batches/:id" element={<AdminBatchDetail />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
