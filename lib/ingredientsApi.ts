// lib/api.ts

export const getIngredients = async () => {
  const response = await fetch('/api/inventory/ingredients/', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    }
  });
  if (!response.ok) throw await response.json();
  return response.json();
};

export const createIngredient = async (data: any) => {
  const response = await fetch('/api/inventory/ingredients/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw await response.json();
  return response.json();
};

export const deleteIngredient = async (id: number | string) => {
  const response = await fetch(`/api/inventory/ingredients/${id}/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    }
  });
  if (!response.ok) throw await response.json();
  return response.json();
};

export const getCategories = async () => {
  const response = await fetch('/api/inventory/categories/', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    }
  });
  if (!response.ok) throw await response.json();
  return response.json();
};