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
    title?: string
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

    // Normalize raw data to JSON-safe objects before persistence
    const safeDashboard = JSON.parse(JSON.stringify(sessionData.researchResponse.dashboard || {}))
    const safeFrontierCards = JSON.parse(JSON.stringify(sessionData.researchResponse.frontier_cards || []))
    const safeSourceVault = JSON.parse(JSON.stringify(sessionData.researchResponse.referenced_sources || []))
    const safeConsensus = JSON.parse(JSON.stringify(sessionData.researchResponse.council_consensus || {}))
    const safeStream = JSON.parse(JSON.stringify(sessionData.researchResponse.agent_stream || []))

    await setDoc(
      sessionRef,
      {
        id: sessionData.id,
        title: sessionData.title || sessionData.topic || "Untitled Session",
        topic: sessionData.topic || "",
        level: sessionData.level || 1,
        lengthMode: sessionData.lengthMode || "Detailed",
        filters: sessionData.filters || {},

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        dashboard: safeDashboard,
        frontierCards: safeFrontierCards,
        sourceVault: safeSourceVault,
        councilConsensus: safeConsensus,
        agentStream: safeStream,
        sessionStats: JSON.parse(JSON.stringify(sessionData.researchResponse.session_stats || {})),

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

    return snapshot.docs.map(doc => {
      const data = doc.data();
      let safeDate = new Date().toISOString();
      if (data.createdAt?.toDate) {
        safeDate = data.createdAt.toDate().toISOString();
      } else if (data.createdAt?.seconds) {
        safeDate = new Date(data.createdAt.seconds * 1000).toISOString();
      }

      return {
        id: doc.id,
        title: data.title || data.topic || "Untitled Session",
        topic: data.topic || "",
        level: data.level || 1,
        lengthMode: data.lengthMode || "Detailed",
        createdAt: safeDate,
      };
    })
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
    
    let safeDate = new Date().toISOString();
    if (data.createdAt?.toDate) {
      safeDate = data.createdAt.toDate().toISOString();
    } else if (data.createdAt?.seconds) {
      safeDate = new Date(data.createdAt.seconds * 1000).toISOString();
    }

    return {
      id: data.id,
      title: data.title || data.topic || "Untitled Session",
      topic: data.topic || "",
      level: data.level || 1,
      lengthMode: data.lengthMode || "Detailed",
      createdAt: safeDate,
      filters: data.filters || {},
      
      researchData: {
        session: {
          topic: data.topic || "",
          level: data.level || 1,
          level_name: ["", "Casual", "Curious", "Specialist", "Expert"][data.level || 1],
          length_mode: data.lengthMode || "Detailed",
          timestamp: safeDate,
        },
        dashboard: data.dashboard || {},
        frontier_cards: data.frontierCards || [],
        referenced_sources: data.sourceVault || [],
        council_consensus: data.councilConsensus || {},
        agent_stream: data.agentStream || [],
        session_stats: data.sessionStats || { overall_confidence: 0, decay_flags: 0, cross_domain_links: 0, gap_count: 0, frontier_cards: 0 },
      },
      
      annotations: data.annotations ?? {
        bookmarkedClaims: [],
        notes: '',
        rating: 0,
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
