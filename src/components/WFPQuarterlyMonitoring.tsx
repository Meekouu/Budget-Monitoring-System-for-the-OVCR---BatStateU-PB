import React from 'react';
import type { WFPActivity } from '../types/wfp';

interface WFPQuarterlyMonitoringProps {
  activities: WFPActivity[];
}

const WFPQuarterlyMonitoring: React.FC<WFPQuarterlyMonitoringProps> = ({ activities }) => {
  const calculateTotal = (field: keyof WFPActivity) => {
    return activities.reduce((sum, activity) => sum + (Number(activity[field]) || 0), 0);
  };

  const calculatePercentage = (accomplished: number, target: number) => {
    if (target === 0) return 0;
    return Math.round((accomplished / target) * 100);
  };

  const getIndicatorColor = (percentage: number) => {
    if (percentage >= 100) return 'text-green-600 bg-green-50';
    if (percentage >= 75) return 'text-blue-600 bg-blue-50';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const totalQ1Target = calculateTotal('q1Target');
  const totalQ1Accomplished = calculateTotal('q1Accomplished');
  const totalQ2Target = calculateTotal('q2Target');
  const totalQ2Accomplished = calculateTotal('q2Accomplished');
  const totalQ3Target = calculateTotal('q3Target');
  const totalQ3Accomplished = calculateTotal('q3Accomplished');
  const totalQ4Target = calculateTotal('q4Target');
  const totalQ4Accomplished = calculateTotal('q4Accomplished');

  const totalTarget = totalQ1Target + totalQ2Target + totalQ3Target + totalQ4Target;
  const totalAccomplished = totalQ1Accomplished + totalQ2Accomplished + totalQ3Accomplished + totalQ4Accomplished;

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">WFP PAPs Quarterly Monitoring</h2>
        <p className="text-sm text-gray-500 mt-1">Track quarterly targets and accomplishments</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program/Project</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Q1 Target</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Q1 Accomplished</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Q2 Target</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Q2 Accomplished</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Q3 Target</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Q3 Accomplished</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Q4 Target</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Q4 Accomplished</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Physical %</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Budget %</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {activities.map((activity) => (
              <tr key={activity.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{activity.programName}</div>
                  <div className="text-sm text-gray-500">{activity.projectName}</div>
                  <div className="text-xs text-gray-400">{activity.activityName}</div>
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-900">
                  {activity.q1Target || 0}
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-900">
                  {activity.q1Accomplished || 0}
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-900">
                  {activity.q2Target || 0}
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-900">
                  {activity.q2Accomplished || 0}
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-900">
                  {activity.q3Target || 0}
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-900">
                  {activity.q3Accomplished || 0}
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-900">
                  {activity.q4Target || 0}
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-900">
                  {activity.q4Accomplished || 0}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getIndicatorColor(activity.physicalAccomplishment || 0)}`}>
                    {activity.physicalAccomplishment || 0}%
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getIndicatorColor(activity.budgetUtilization || 0)}`}>
                    {activity.budgetUtilization || 0}%
                  </span>
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-semibold">
              <td className="px-6 py-4 text-sm text-gray-900">TOTAL</td>
              <td className="px-6 py-4 text-center text-sm text-gray-900">{totalQ1Target}</td>
              <td className="px-6 py-4 text-center text-sm text-gray-900">{totalQ1Accomplished}</td>
              <td className="px-6 py-4 text-center text-sm text-gray-900">{totalQ2Target}</td>
              <td className="px-6 py-4 text-center text-sm text-gray-900">{totalQ2Accomplished}</td>
              <td className="px-6 py-4 text-center text-sm text-gray-900">{totalQ3Target}</td>
              <td className="px-6 py-4 text-center text-sm text-gray-900">{totalQ3Accomplished}</td>
              <td className="px-6 py-4 text-center text-sm text-gray-900">{totalQ4Target}</td>
              <td className="px-6 py-4 text-center text-sm text-gray-900">{totalQ4Accomplished}</td>
              <td className="px-6 py-4 text-center">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getIndicatorColor(calculatePercentage(totalAccomplished, totalTarget))}`}>
                  {calculatePercentage(totalAccomplished, totalTarget)}%
                </span>
              </td>
              <td className="px-6 py-4 text-center text-sm text-gray-900">-</td>
            </tr>
          </tbody>
        </table>
      </div>

      {activities.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No activities found</p>
        </div>
      )}
    </div>
  );
};

export default WFPQuarterlyMonitoring;
