import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { campuses, colleges, programs, projects, activities, fundingSources, budgetLines } from '../data/seedData';

export const seedDatabase = async () => {
  console.log('Seeding database...');
  
  try {
    // Seed Campuses
    for (const campus of campuses) {
      await setDoc(doc(db, 'campuses', campus.id), campus);
    }
    console.log('✓ Campuses seeded');

    // Seed Colleges
    for (const college of colleges) {
      await setDoc(doc(db, 'colleges', college.id), college);
    }
    console.log('✓ Colleges seeded');

    // Seed Programs
    for (const program of programs) {
      await setDoc(doc(db, 'programs', program.id), program);
    }
    console.log('✓ Programs seeded');

    // Seed Projects
    for (const project of projects) {
      await setDoc(doc(db, 'projects', project.id), project);
    }
    console.log('✓ Projects seeded');

    // Seed Activities
    for (const activity of activities) {
      await setDoc(doc(db, 'activities', activity.id), activity);
    }
    console.log('✓ Activities seeded');

    // Seed Funding Sources
    for (const source of fundingSources) {
      await setDoc(doc(db, 'fundingSources', source.id), source);
    }
    console.log('✓ Funding Sources seeded');

    // Seed Budget Lines
    for (const budgetLine of budgetLines) {
      await setDoc(doc(db, 'budgetLines', budgetLine.id), budgetLine);
    }
    console.log('✓ Budget Lines seeded');

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};
