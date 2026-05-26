import { db, auth } from './firebase'
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore'
import type { ResearchResponse } from './types'

export async function createOrUpdateUser(
  userId: string,
  data: {
    email: string
    username: string
  }
) {
  try {
    const userRef = doc(db, 'users', userId)
    await setDoc(
      userRef,
      {
        email: data.email,
        username: data.username,
        createdAt: serverTimestamp(),
        preferences: {
          defaultLevel: 2,
          defaultLengthMode: 'Detailed',
          sidebarCollapsed: false,
          theme: 'observatory',
        },
      },
      { merge: true }
    )
  } catch (e) {
    console.warn('[Firestore] createOrUpdateUser failed:', e)
  }
}

export async function updateUserPreference(
  userId: string,
  key: string,
  value: any
) {
  try {
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      [`preferences.${key}`]: value
    })
  } catch(e) {
    console.warn('[Firestore] updateUserPreference failed:', e)
  }
}

export async function saveSession(
  userId: string,
  sessionData: {
    id: string
    topic: string
    level: number
    lengthMode: string
    filters: any
    researchResponse: ResearchResponse
  }
) {
  try {
    const sessionRef = doc(
      db,
      'users',
      userId,
      'sessions',
      sessionData.id
    )

    await setDoc(
      sessionRef,
      {
        id: sessionData.id,
        topic: sessionData.topic,
        level: sessionData.level,
        lengthMode: sessionData.lengthMode,
        filters: sessionData.filters,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        dashboard: sessionData.researchResponse.dashboard,

        frontierCards:
          sessionData.researchResponse.frontier_cards ?? [],

        sourceVault:
          sessionData.researchResponse.referenced_sources ?? [],

        councilConsensus:
          sessionData.researchResponse.council_consensus ?? {},

        agentStream:
          sessionData.researchResponse.agent_stream ?? [],

        annotations: {
          bookmarkedClaims: [],
          notes: '',
          highlights: [],
          rating: 0,
        },

        exports: [],
      },
      {
        merge: true,
      }
    )
  } catch (e) {
    console.warn('[Firestore] saveSession failed:', e)
  }
}

export async function loadSessions(userId: string) {
  try {
    const sessionsRef = collection(
      db,
      'users',
      userId,
      'sessions'
    )

    const q = query(
      sessionsRef,
      orderBy('createdAt', 'desc'),
      limit(50)
    )

    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => ({
      id: doc.id,
      topic: doc.data().topic,
      level: doc.data().level,
      lengthMode: doc.data().lengthMode,
      timestamp:
        doc.data().createdAt?.toDate?.()?.toISOString() ??
        new Date().toISOString(),
    }))
  } catch (e) {
    console.warn('[Firestore] loadSessions failed:', e)
    return []
  }
}

export async function loadFullSession(
  userId: string,
  sessionId: string
) {
  try {
    const sessionRef = doc(
      db,
      'users',
      userId,
      'sessions',
      sessionId
    )

    const snapshot = await getDoc(sessionRef)

    if (!snapshot.exists()) return null

    const data = snapshot.data()

    return {
      id: data.id,
      topic: data.topic,
      level: data.level,
      lengthMode: data.lengthMode,

      timestamp: data.createdAt?.toDate?.()?.toISOString(),

      filters: data.filters,
      annotations: data.annotations ?? {
        bookmarkedClaims: [],
        notes: '',
        rating: 0,
      },

      researchData: {
        dashboard: data.dashboard,
        frontier_cards: data.frontierCards,
        referenced_sources: data.sourceVault,
        council_consensus: data.councilConsensus,
        agent_stream: data.agentStream,
      },
    }
  } catch (e) {
    console.warn('[Firestore] loadFullSession failed:', e)
    return null
  }
}

export async function updateAnnotations(
  userId: string,
  sessionId: string,
  annotations: object
) {
  try {
    const sessionRef = doc(
      db,
      'users',
      userId,
      'sessions',
      sessionId
    )

    await updateDoc(sessionRef, {
      annotations,
      updatedAt: serverTimestamp(),
    })
  } catch (e) {
    console.warn('[Firestore] updateAnnotations failed:', e)
  }
}

export async function deleteSession(
  userId: string,
  sessionId: string
) {
  try {
    const sessionRef = doc(
      db,
      'users',
      userId,
      'sessions',
      sessionId
    )

    await deleteDoc(sessionRef)
  } catch (e) {
    console.warn('[Firestore] deleteSession failed:', e)
  }
}

export async function saveFilterPreset(
  userId: string,
  preset: {
    id?: string
    name: string
    dateRange: object
    country: string
    journalRank: string
    minCitations: number
  }
) {
  try {
    let presetRef;
    if (preset.id) {
      presetRef = doc(db, 'users', userId, 'filterPresets', preset.id);
    } else {
      presetRef = doc(collection(db, 'users', userId, 'filterPresets'));
    }

    await setDoc(presetRef, {
      name: preset.name,
      dateRange: preset.dateRange,
      country: preset.country,
      journalRank: preset.journalRank,
      minCitations: preset.minCitations,
      createdAt: serverTimestamp(),
    }, { merge: true })

    return presetRef.id
  } catch (e) {
    console.warn('[Firestore] saveFilterPreset failed:', e)
    return null
  }
}

export async function loadFilterPresets(userId: string) {
  try {
    const presetsRef = collection(
      db,
      'users',
      userId,
      'filterPresets'
    )

    const snapshot = await getDocs(presetsRef)

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (e) {
    console.warn('[Firestore] loadFilterPresets failed:', e)
    return []
  }
}
