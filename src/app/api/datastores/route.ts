import { NextResponse } from 'next/server';
import { getAccessToken, getProjectId } from '@/lib/auth';
import { STREAM_ASSIST_BASE_URL, buildDataStorePath } from '@/lib/constants';

function getConfig() {
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'global';
  const endpointLocation = process.env.ENDPOINT_LOCATION || 'us';
  return { location, endpointLocation };
}

export async function GET() {
  try {
    const token = await getAccessToken();
    const projectId = await getProjectId();
    const { location, endpointLocation } = getConfig();

    const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);
    const path = buildDataStorePath(projectId, location);

    const response = await fetch(`${baseUrl}/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`List datastores error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json({ dataStores: data.dataStores || [] });
  } catch (error) {
    console.error('List datastores error:', error);
    return NextResponse.json(
      { error: 'Failed to list datastores' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = await getAccessToken();
    const projectId = await getProjectId();
    const { location, endpointLocation } = getConfig();

    const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);
    const path = buildDataStorePath(projectId, location);

    const response = await fetch(`${baseUrl}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Create datastore error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Create datastore error:', error);
    return NextResponse.json(
      { error: 'Failed to create datastore' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { name, ...updateData } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Datastore name is required' },
        { status: 400 },
      );
    }

    const token = await getAccessToken();
    const { endpointLocation } = getConfig();
    const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);

    const response = await fetch(`${baseUrl}/${name}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Update datastore error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Update datastore error:', error);
    return NextResponse.json(
      { error: 'Failed to update datastore' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json(
        { error: 'Datastore name is required' },
        { status: 400 },
      );
    }

    const token = await getAccessToken();
    const { endpointLocation } = getConfig();
    const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);

    const response = await fetch(`${baseUrl}/${name}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Delete datastore error (${response.status}): ${errorText}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete datastore error:', error);
    return NextResponse.json(
      { error: 'Failed to delete datastore' },
      { status: 500 },
    );
  }
}
